import React, { useState, useEffect } from 'react';
import { rtdb } from '../../services/firebase';
import type { Report } from '../../types';
import { toast } from 'react-toastify';
import Button from '../../components/common/Button';
import { Spinner } from '../../components/common/Spinner';

const ReportManagement: React.FC = () => {
    const [reports, setReports] = useState<(Report & { id: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<{[key: string]: boolean}>({});

    useEffect(() => {
        const reportsRef = rtdb.ref('reports').orderByChild('timestamp');
        const listener = reportsRef.on('value', snapshot => {
            const data: (Report & { id: string })[] = [];
            if (snapshot.exists()) {
                snapshot.forEach(child => {
                    data.push({ id: child.key!, ...child.val() });
                });
            }
            // Sort by status: new > investigating > resolved, then by timestamp descending
            data.sort((a, b) => {
                const statusOrder = { 'new': 0, 'investigating': 1, 'resolved': 2 };
                if (statusOrder[a.status] !== statusOrder[b.status]) {
                    return statusOrder[a.status] - statusOrder[b.status];
                }
                return b.timestamp - a.timestamp;
            });
            setReports(data);
            setLoading(false);
        });
        return () => reportsRef.off('value', listener);
    }, []);

    const handleUpdateStatus = async (reportId: string, newStatus: 'investigating' | 'resolved') => {
        setActionLoading(prev => ({ ...prev, [reportId]: true }));
        try {
            await rtdb.ref(`reports/${reportId}/status`).set(newStatus);
            toast.success(`Report status updated to ${newStatus}.`);
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setActionLoading(prev => ({ ...prev, [reportId]: false }));
        }
    }
    
    const formatTime = (timestamp: number) => {
        return new Date(timestamp).toLocaleString();
    };

    const getStatusColor = (status: Report['status']) => {
        switch(status) {
            case 'new': return 'bg-red-500';
            case 'investigating': return 'bg-yellow-500';
            case 'resolved': return 'bg-green-500';
        }
    }

    return (
        <div className="p-6 bg-[#2c2c54] border-2 border-black shadow-[4px_4px_0px_#000000] rounded-lg">
            <h2 className="text-lg font-semibold mb-4">Player Reports</h2>
            {loading ? <Spinner /> :
             reports.length === 0 ? <p className="text-gray-400">No reports found.</p> :
            (
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    {reports.map(report => (
                        <div key={report.id} className="p-4 bg-gray-900 border-2 border-black">
                            <div className="flex justify-between items-start mb-2">
                                <div className="text-xs space-y-1">
                                    <p><span className="font-bold text-gray-400">Reporter:</span> {report.reporterName || 'Anonymous'} ({report.reporterUid})</p>
                                    <p><span className="font-bold text-gray-400">Reported:</span> {report.reportedName || 'Anonymous'} ({report.reportedUid})</p>
                                    <p><span className="font-bold text-gray-400">Category:</span> {report.category}</p>
                                    <p className="text-gray-500 break-all"><span className="font-bold text-gray-400">Match ID:</span> {report.matchId}</p>
                                </div>
                                <div className="text-right">
                                    <span className={`px-2 py-1 text-xs font-bold text-white rounded-full ${getStatusColor(report.status)}`}>{report.status}</span>
                                    <p className="text-xs text-gray-500 mt-1">{formatTime(report.timestamp)}</p>
                                </div>
                            </div>
                            <p className="text-sm bg-black/30 p-2 border border-gray-700 rounded-md">{report.details || 'No details provided.'}</p>
                            <div className="mt-3 pt-3 border-t border-gray-700 flex justify-end gap-3">
                                {report.status === 'new' && 
                                    <Button 
                                        onClick={() => handleUpdateStatus(report.id, 'investigating')} 
                                        disabled={actionLoading[report.id]}
                                        variant="secondary"
                                        className="!py-1 !px-3 !text-xs"
                                    >
                                        Investigate
                                    </Button>
                                }
                                {report.status === 'investigating' &&
                                    <Button 
                                        onClick={() => handleUpdateStatus(report.id, 'resolved')} 
                                        disabled={actionLoading[report.id]}
                                        variant="success"
                                        className="!py-1 !px-3 !text-xs"
                                    >
                                        Resolve
                                    </Button>
                                }
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ReportManagement;