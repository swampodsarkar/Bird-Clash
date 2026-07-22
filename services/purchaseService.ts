

import { rtdb } from './firebase';
import firebase from 'firebase/compat/app';
import type { Player, PurchaseRequest, TopUpProduct } from '../types';
import { TOP_UP_PRODUCTS } from '../constants';

export const createPurchaseRequest = async (
    player: Player,
    product: TopUpProduct,
    paymentMethod: 'bkash' | 'nagad' | 'rocket',
    transactionId: string,
    senderNumber: string
): Promise<void> => {
    const requestRef = rtdb.ref('purchase_requests').push();
    const newRequest: Omit<PurchaseRequest, 'id'> = {
        uid: player.uid,
        displayName: player.displayName,
        photoURL: player.photoURL,
        productId: product.id,
        productName: product.name,
        price: product.price,
        paymentMethod,
        transactionId,
        senderNumber,
        status: 'pending',
        createdAt: firebase.database.ServerValue.TIMESTAMP as any,
    };
    await requestRef.set(newRequest);
};

export const claimDailyMembershipRewards = async (userId: string): Promise<string> => {
    const userRef = rtdb.ref(`users/${userId}`);
    let gemsAdded = 0;

    const { committed } = await userRef.transaction(player => {
        if (!player) return; // Abort

        const now = Date.now();
        const todayStr = new Date(now).toISOString().split('T')[0]; // 'YYYY-MM-DD'

        let gemsToAdd = 0;
        let claimedSomething = false;

        // Weekly Membership
        if (player.weeklyMembershipExpires && player.weeklyMembershipExpires > now) {
            if (!player.weeklyClaims) player.weeklyClaims = [];
            if (!player.weeklyClaims.includes(todayStr)) {
                gemsToAdd += 60;
                player.weeklyClaims.push(todayStr);
                claimedSomething = true;
            }
        }

        // Monthly Membership
        if (player.monthlyMembershipExpires && player.monthlyMembershipExpires > now) {
            if (!player.monthlyClaims) player.monthlyClaims = [];
            if (!player.monthlyClaims.includes(todayStr)) {
                gemsToAdd += 80;
                player.monthlyClaims.push(todayStr);
                claimedSomething = true;
            }
        }

        if (!claimedSomething) {
            return; // Abort: Already claimed or no active membership
        }

        if (gemsToAdd > 0) {
            player.gems = (player.gems || 0) + gemsToAdd;
            player.lastMembershipClaim = now; // Keep for compatibility
            gemsAdded = gemsToAdd;
        }

        return player;
    });

    if (!committed) {
        throw new Error("Could not claim reward. You may have already claimed it today, or your membership is inactive.");
    }
    
    if (gemsAdded > 0) {
        return `You claimed ${gemsAdded} gems!`;
    } else {
        throw new Error("No rewards were available to claim.");
    }
};

// Admin Functions
export const approvePurchase = async (requestId: string): Promise<void> => {
    const requestRef = rtdb.ref(`purchase_requests/${requestId}`);
    const requestSnapshot = await requestRef.once('value');
    if (!requestSnapshot.exists()) {
        throw new Error("Purchase request not found.");
    }

    const request = requestSnapshot.val() as PurchaseRequest;
    if (request.status !== 'pending') {
        throw new Error(`Request is already ${request.status}.`);
    }

    const userRef = rtdb.ref(`users/${request.uid}`);
    const updates: { [key: string]: any } = {};
    updates[`purchase_requests/${requestId}/status`] = 'approved';

    const product = TOP_UP_PRODUCTS.find(p => p.id === request.productId);
    if (!product) {
        updates[`purchase_requests/${requestId}/status`] = 'rejected';
        await rtdb.ref().update(updates);
        throw new Error(`Product with ID ${request.productId} not found.`);
    }

    if (product.type === 'gems') {
        updates[`users/${request.uid}/gems`] = firebase.database.ServerValue.increment(product.payload.gems || 0);
        updates[`users/${request.uid}/eventGemsToppedUp`] = firebase.database.ServerValue.increment(product.payload.gems || 0);
        updates[`users/${request.uid}/totalGemsToppedUp`] = firebase.database.ServerValue.increment(product.payload.gems || 0);
    } else if (product.type === 'weekly_membership' || product.type === 'monthly_membership') {
        const duration = (product.payload.durationDays || 0) * 24 * 60 * 60 * 1000;
        const expiryKey = product.type === 'weekly_membership' ? 'weeklyMembershipExpires' : 'monthlyMembershipExpires';
        
        const userSnapshot = await userRef.once('value');
        const player = userSnapshot.val() as Player;
        const currentExpiry = player[expiryKey] || 0;
        const newExpiry = (currentExpiry > Date.now() ? currentExpiry : Date.now()) + duration;
        
        updates[`users/${request.uid}/${expiryKey}`] = newExpiry;
    }

    await rtdb.ref().update(updates);
};

export const rejectPurchase = async (requestId: string): Promise<void> => {
    await rtdb.ref(`purchase_requests/${requestId}`).update({ status: 'rejected' });
};
