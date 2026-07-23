
import React, { useState, useEffect, useRef } from 'react';
import { rtdb } from '../../services/firebase';
import { Spinner } from '../../components/common/Spinner';

interface DataPoint {
    label: string;
    total: number;
    real: number;
    simulated: number;
}

const LivePlayerCount: React.FC = () => {
    const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
    const [currentTotal, setCurrentTotal] = useState(0);
    const [realCount, setRealCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const baseRef = useRef(300);

    useEffect(() => {
        const statusRef = rtdb.ref('status');

        const listener = statusRef.on('value', snapshot => {
            let real = 0;
            if (snapshot.exists()) {
                const val = snapshot.val();
                real = val.anonymousPlayers || val.onlinePlayers || 0;
            }
            setRealCount(real);
            setLoading(false);
        });

        return () => statusRef.off('value', listener);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            const seconds = Math.floor(now / 1000);
            const oscillation = Math.sin(seconds * 0.05) * 80;
            const noise = (Math.random() - 0.5) * 40;
            const simulated = Math.max(0, Math.round(baseRef.current + oscillation + noise));
            const real = realCount;
            const total = real + simulated;

            setCurrentTotal(total);

            const label = new Date(now).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            setDataPoints(prev => {
                const next = [...prev, { label, total, real, simulated }];
                if (next.length > 30) next.splice(0, next.length - 30);
                return next;
            });
        }, 2000);

        return () => clearInterval(interval);
    }, [realCount]);

    const maxVal = Math.max(...dataPoints.map(d => d.total), 400);
    const chartHeight = 200;

    return (
        <div className="space-y-6 p-6 bg-[#1a1a2e] rounded-lg border-2 border-black shadow-[4px_4px_0px_#000000]">
            <h2 className="text-lg font-semibold mb-4">Live Player Count</h2>

            <div className="flex gap-4 mb-4">
                <div className="p-4 bg-[#2c2c54] border-2 border-black rounded-lg flex-1 text-center">
                    <p className="text-sm text-gray-400">Current Online</p>
                    <p className="text-3xl font-bold text-green-400">{currentTotal.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-[#2c2c54] border-2 border-black rounded-lg flex-1 text-center">
                    <p className="text-sm text-gray-400">Real Players</p>
                    <p className="text-3xl font-bold text-blue-400">{realCount.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-[#2c2c54] border-2 border-black rounded-lg flex-1 text-center">
                    <p className="text-sm text-gray-400">Simulated Players</p>
                    <p className="text-3xl font-bold text-yellow-400">{(currentTotal - realCount).toLocaleString()}</p>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-8"><Spinner /></div>
            ) : (
                <div className="bg-[#0a0a1a] border-2 border-black rounded-lg p-4">
                    <div className="relative" style={{ height: chartHeight }}>
                        {dataPoints.length > 1 && (
                            <svg className="w-full h-full" preserveAspectRatio="none" viewBox={`0 0 ${dataPoints.length - 1} ${maxVal}`}>
                                <polyline
                                    fill="none"
                                    stroke="#22c55e"
                                    strokeWidth="2"
                                    points={dataPoints.map((d, i) => `${i},${maxVal - d.total}`).join(' ')}
                                />
                                <polyline
                                    fill="none"
                                    stroke="#3b82f6"
                                    strokeWidth="1.5"
                                    strokeDasharray="4 2"
                                    points={dataPoints.map((d, i) => `${i},${maxVal - d.real}`).join(' ')}
                                />
                                <polyline
                                    fill="none"
                                    stroke="#eab308"
                                    strokeWidth="1.5"
                                    strokeDasharray="4 2"
                                    points={dataPoints.map((d, i) => `${i},${maxVal - d.simulated}`).join(' ')}
                                />
                                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
                                    <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                                </linearGradient>
                                <polygon
                                    fill="url(#areaGrad)"
                                    points={`${dataPoints.map((d, i) => `${i},${maxVal - d.total}`).join(' ')} ${dataPoints.length - 1},${maxVal} 0,${maxVal}`}
                                />
                            </svg>
                        )}
                        {dataPoints.length <= 1 && (
                            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                                Collecting data...
                            </div>
                        )}
                    </div>
                    <div className="flex justify-between mt-2 text-[10px] text-gray-500">
                        {dataPoints.length > 0 && (
                            <>
                                <span>{dataPoints[0].label}</span>
                                <span>{dataPoints[Math.floor(dataPoints.length / 2)]?.label}</span>
                                <span>{dataPoints[dataPoints.length - 1].label}</span>
                            </>
                        )}
                    </div>
                </div>
            )}

            <div className="flex gap-4 text-xs text-gray-400">
                <div className="flex items-center gap-1">
                    <span className="w-3 h-0.5 bg-green-500 inline-block"></span>
                    <span>Total</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="w-3 h-0.5 bg-blue-500 inline-block border-dashed" style={{ borderTop: '1.5px dashed #3b82f6', height: 0 }}></span>
                    <span>Real</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="w-3 h-0.5 bg-yellow-500 inline-block border-dashed" style={{ borderTop: '1.5px dashed #eab308', height: 0 }}></span>
                    <span>Simulated</span>
                </div>
            </div>
        </div>
    );
};

export default LivePlayerCount;
