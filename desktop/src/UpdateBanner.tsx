import React, { useEffect, useState } from 'react';
import { UpdateStatusData } from './global';

interface UpdateState {
  status: 'idle' | 'available' | 'downloading' | 'ready';
  version?: string;
  percent?: number;
  bytesPerSecond?: number;
}

export const UpdateBanner: React.FC<{ currentScreen: string }> = ({ currentScreen }) => {
  const [updateState, setUpdateState] = useState<UpdateState>({ status: 'idle' });

  useEffect(() => {
    if (!window.updater || !window.updater.onStatus) return;

    const unsubscribe = window.updater.onStatus((data: UpdateStatusData) => {
      console.log('[Dev Terminal] [Updater Event]', data.event, data);
      if (data.event === 'update-available') {
        setUpdateState({
          status: 'available',
          version: data.version
        });
      } else if (data.event === 'download-progress') {
        setUpdateState(prev => ({
          status: 'downloading',
          version: prev.version || data.version,
          percent: data.percent ?? 0,
          bytesPerSecond: data.bytesPerSecond ?? 0
        }));
      } else if (data.event === 'update-downloaded') {
        setUpdateState({
          status: 'ready',
          version: data.version
        });
      } else if (data.event === 'checking-for-update' || data.event === 'update-not-available' || data.event === 'error') {
        setUpdateState({ status: 'idle' });
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Render ONLY on ACTIVATION and DASHBOARD screens
  if (currentScreen !== 'ACTIVATION' && currentScreen !== 'DASHBOARD') {
    return null;
  }

  if (updateState.status === 'idle') {
    return null;
  }

  const formatSpeed = (bytesPerSec?: number): string => {
    if (!bytesPerSec || bytesPerSec <= 0) return '0 KB/s';
    const kbPerSec = bytesPerSec / 1024;
    if (kbPerSec >= 1024) {
      return (kbPerSec / 1024).toFixed(1) + ' MB/s';
    }
    return Math.round(kbPerSec) + ' KB/s';
  };

  const handleInstall = () => {
    if (window.updater && window.updater.install) {
      window.updater.install();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        backgroundColor: '#1d3090',
        color: '#ffffff',
        padding: '10px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: updateState.status === 'ready' ? '#10b981' : '#3b82f6',
              display: 'inline-block'
            }}
          />
          <strong style={{ fontSize: '13px', letterSpacing: '0.2px' }}>
            {updateState.status === 'available' && `Update ${updateState.version || ''} found, starting download`}
            {updateState.status === 'downloading' && `Downloading update ${updateState.version ? `(${updateState.version})` : ''}...`}
            {updateState.status === 'ready' && `Version ${updateState.version || ''} is ready`}
          </strong>
        </div>

        {updateState.status === 'downloading' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, maxWidth: '400px' }}>
            <div
              style={{
                flex: 1,
                height: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '4px',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  width: `${updateState.percent || 0}%`,
                  height: '100%',
                  backgroundColor: '#10b981',
                  transition: 'width 0.2s ease'
                }}
              />
            </div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#e0e7ff', whiteSpace: 'nowrap' }}>
              {updateState.percent || 0}% ({formatSpeed(updateState.bytesPerSecond)})
            </span>
          </div>
        )}
      </div>

      {updateState.status === 'ready' && (
        <button
          onClick={handleInstall}
          style={{
            backgroundColor: '#10b981',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            padding: '6px 16px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'background-color 0.15s ease',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)'
          }}
        >
          Restart and install
        </button>
      )}
    </div>
  );
};
