import { Alert, Platform } from 'react-native';

interface AlertButton {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export const showAlert = (
  title: string,
  message?: string,
  buttons?: AlertButton[]
) => {
  if (Platform.OS === 'web') {
    const fullMessage = message ? `${title}\n\n${message}` : title;
    
    if (buttons && buttons.length > 0) {
      // If there are buttons, present a confirmation or selection
      const cancelBtn = buttons.find(b => b.style === 'cancel');
      const defaultOrDestructiveBtn = buttons.find(b => b.style !== 'cancel');
      
      const confirmed = window.confirm(fullMessage);
      if (confirmed) {
        if (defaultOrDestructiveBtn && defaultOrDestructiveBtn.onPress) {
          defaultOrDestructiveBtn.onPress();
        }
      } else {
        if (cancelBtn && cancelBtn.onPress) {
          cancelBtn.onPress();
        }
      }
    } else {
      window.alert(fullMessage);
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};
