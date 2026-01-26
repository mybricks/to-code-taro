import React from 'react';
import { View } from '@tarojs/components';
import { useAppContext } from './ComContext';

interface PopupRendererProps {
  popupMap: Record<string, any>;
}

export const PopupRenderer: React.FC<PopupRendererProps> = ({ popupMap }) => {
  const { popupState } = useAppContext();

  const ActivePopup = popupState.visible && popupMap[popupState.name] 
    ? popupMap[popupState.name] 
    : null;

  if (!ActivePopup) return <View></View>;

  return (
    <View 
      className="global-popup-container" 
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999999,
        pointerEvents: 'auto',
      }}
    >
      <View style={{ width: '100%', height: '100%' }}>
        <ActivePopup />
      </View>
    </View>
  );
};

