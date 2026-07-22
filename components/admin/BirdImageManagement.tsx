import React, { useState, useEffect } from 'react';
import { rtdb } from '../../services/firebase';
import { BIRD_DEFINITIONS, IMGBB_API_KEY } from '../../constants';
import { toast } from 'react-toastify';
import Button from '../common/Button';
import { Spinner } from '../common/Spinner';

const BirdImageManagement: React.FC = () => {
    const [birdImages, setBirdImages] = useState<{ [key: string]: string }>({});
    const [loading, setLoading] = useState(true);
    const [uploadingId, setUploadingId] = useState<string | null>(null);

    useEffect(() => {
        const imagesRef = rtdb.ref('contentConfig/birdImages');
        const listener = imagesRef.on('value', snapshot => {
            setBirdImages(snapshot.val() || {});
            setLoading(false);
        });
        return () => imagesRef.off('value', listener);
    }, []);

    const handleImageUpload = async (birdId: string, file: File) => {
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            toast.error("File is too large. Max size is 5MB.");
            return;
        }
        setUploadingId(birdId);
        try {
            const formData = new FormData();
            formData.append('image', file);

            const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Upload failed with status: ${response.statusText}`);
            }
            
            const result = await response.json();
            if (!result.success) {
                console.error("ImgBB API Error:", result);
                throw new Error(result.error?.message || 'Image upload failed.');
            }

            const imageUrl = result.data.url; // Use direct image URL
            await rtdb.ref(`contentConfig/birdImages/${birdId}`).set(imageUrl);
            toast.success("Bird image updated!");
        } catch (err: any) {
            console.error("Upload error:", err);
            toast.error(err.message || "Failed to upload image.");
        } finally {
            setUploadingId(null);
        }
    };
    
    const handleRemoveImage = async (birdId: string) => {
        if (!window.confirm("Are you sure you want to remove this custom image and revert to the default emoji?")) return;
        try {
            await rtdb.ref(`contentConfig/birdImages/${birdId}`).remove();
            toast.success("Custom image removed.");
        } catch (e: any) {
            toast.error(e.message);
        }
    }

    return (
        <div className="p-6 bg-[#2c2c54] border-2 border-black shadow-[4px_4px_0px_#000000] rounded-lg">
            <h2 className="text-lg font-semibold mb-4">Bird Image Management</h2>
            <p className="text-sm text-gray-300 mb-4">Upload custom images for birds. The game will use these images instead of the default emojis. Recommended size: 256x256px.</p>
            {loading ? <Spinner /> : (
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    {Object.values(BIRD_DEFINITIONS).map(bird => {
                        const customImageUrl = birdImages[bird.id];
                        const isUploading = uploadingId === bird.id;
                        return (
                            <div key={bird.id} className="p-4 bg-gray-900 border-2 border-black flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    {customImageUrl ? (
                                        <img src={customImageUrl} alt={bird.name} className="w-16 h-16 object-contain bg-black/20 p-1" />
                                    ) : (
                                        <span className="text-5xl w-16 h-16 flex items-center justify-center">{bird.icon}</span>
                                    )}
                                    <p className="font-semibold">{bird.name}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {isUploading ? <Spinner /> : (
                                        <>
                                            <input
                                                type="file"
                                                id={`upload-${bird.id}`}
                                                hidden
                                                accept="image/png, image/jpeg, image/gif, image/webp"
                                                onChange={(e) => e.target.files && handleImageUpload(bird.id, e.target.files[0])}
                                            />
                                            <Button onClick={() => document.getElementById(`upload-${bird.id}`)?.click()} className="!py-1 !px-3 !text-xs">
                                                Upload
                                            </Button>
                                            {customImageUrl && (
                                                <Button onClick={() => handleRemoveImage(bird.id)} variant="danger" className="!py-1 !px-3 !text-xs">
                                                    Remove
                                                </Button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default BirdImageManagement;