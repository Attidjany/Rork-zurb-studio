/**
 * Drop-in replacement for react-native's Alert that actually works on the web.
 * Native: delegates to the real Alert. Web: message-only alerts become toasts;
 * alerts with choices become an in-app dialog. Mount <AlertHost/> once (in the
 * root layout) for the web UI.
 */
import React, { useEffect, useState } from 'react';
import { Alert as RNAlert, AlertButton, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

interface PendingDialog { id: number; title: string; message?: string; buttons: AlertButton[] }
interface PendingToast { id: number; title: string; message?: string; kind: 'error' | 'success' | 'info' }

let nextId = 1;
let pushDialog: ((d: PendingDialog) => void) | null = null;
let pushToast: ((t: PendingToast) => void) | null = null;

function toastKind(title: string): PendingToast['kind'] {
  if (/error|failed|invalid|required|cannot|unable/i.test(title)) return 'error';
  if (/success|created|saved|updated|deleted|copied|done/i.test(title)) return 'success';
  return 'info';
}

export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[]) {
    if (Platform.OS !== 'web') {
      RNAlert.alert(title, message, buttons);
      return;
    }
    const actionable = (buttons || []).filter(b => typeof b.onPress === 'function');
    if (!buttons || buttons.length <= 1) {
      // Message-only (or single OK): show as a toast, still run a provided handler.
      pushToast?.({ id: nextId++, title, message, kind: toastKind(title) });
      actionable[0]?.onPress?.();
      return;
    }
    pushDialog?.({ id: nextId++, title, message, buttons });
  },
};

export function AlertHost() {
  const [dialogs, setDialogs] = useState<PendingDialog[]>([]);
  const [toasts, setToasts] = useState<PendingToast[]>([]);

  useEffect(() => {
    pushDialog = d => setDialogs(prev => [...prev, d]);
    pushToast = t => {
      setToasts(prev => [...prev.slice(-2), t]);
      setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), 4000);
    };
    return () => { pushDialog = null; pushToast = null; };
  }, []);

  const dialog = dialogs[0];
  const close = (d: PendingDialog, b?: AlertButton) => {
    setDialogs(prev => prev.filter(x => x.id !== d.id));
    b?.onPress?.();
  };

  return (
    <>
      {dialog && (
        <Modal visible transparent animationType="fade" onRequestClose={() => close(dialog, dialog.buttons.find(b => b.style === 'cancel'))}>
          <View style={s.overlay}>
            <View style={s.dialog}>
              <Text style={s.title}>{dialog.title}</Text>
              {!!dialog.message && <Text style={s.message}>{dialog.message}</Text>}
              <View style={s.buttons}>
                {dialog.buttons.map((b, i) => (
                  <Pressable
                    key={i}
                    style={({ hovered, pressed }: any) => [s.button, b.style === 'cancel' ? s.cancel : b.style === 'destructive' ? s.destructive : s.primary, (hovered || pressed) && s.buttonHover]}
                    onPress={() => close(dialog, b)}
                  >
                    <Text style={[s.buttonText, b.style === 'cancel' ? s.cancelText : b.style === 'destructive' ? s.destructiveText : s.primaryText]}>
                      {b.text || 'OK'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </Modal>
      )}
      <View pointerEvents="none" style={s.toastWrap}>
        {toasts.map(t => (
          <View key={t.id} style={[s.toast, t.kind === 'error' ? s.toastError : t.kind === 'success' ? s.toastSuccess : null]}>
            <Text style={s.toastTitle}>{t.title}</Text>
            {!!t.message && <Text style={s.toastMessage}>{t.message}</Text>}
          </View>
        ))}
      </View>
    </>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(16,24,40,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 22, width: '100%', maxWidth: 400, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 24, shadowOffset: { width: 0, height: 8 } },
  title: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 6 },
  message: { fontSize: 15, lineHeight: 21, color: '#4B5563', marginBottom: 6 },
  buttons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14, flexWrap: 'wrap' },
  button: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, minWidth: 84, alignItems: 'center' },
  buttonHover: { opacity: 0.85 },
  primary: { backgroundColor: '#007AFF' },
  primaryText: { color: '#FFFFFF' },
  cancel: { backgroundColor: '#EEF1F5' },
  cancelText: { color: '#374151' },
  destructive: { backgroundColor: '#E5484D' },
  destructiveText: { color: '#FFFFFF' },
  buttonText: { fontSize: 15, fontWeight: '600' },
  toastWrap: { position: 'absolute', top: 16, left: 0, right: 0, alignItems: 'center', gap: 8, zIndex: 9999 },
  toast: { backgroundColor: '#1F2937', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16, maxWidth: 480, marginHorizontal: 16, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  toastError: { backgroundColor: '#B42318' },
  toastSuccess: { backgroundColor: '#0E7A4D' },
  toastTitle: { color: '#FFFFFF', fontSize: 14.5, fontWeight: '700' },
  toastMessage: { color: 'rgba(255,255,255,0.9)', fontSize: 13.5, marginTop: 2 },
});
