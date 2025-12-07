
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { colors } from '@/styles/commonStyles';

const WEBSITE_URL = 'https://bda3e11e-68e8-45b3-9d3c-7c4fff44599c.lovableproject.com';

export default function HomeScreen() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up message listener for iframe communication
    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from our website
      if (event.origin !== new URL(WEBSITE_URL).origin) {
        return;
      }

      try {
        const message = event.data;
        console.log('Message from iframe:', message);

        // Handle messages from the website
        switch (message.type) {
          case 'natively.haptic.trigger':
            console.log('Haptic feedback requested (not supported on web)');
            break;

          case 'natively.clipboard.read':
            navigator.clipboard.readText().then((text) => {
              sendResponse(message.id, { text });
            }).catch((error) => {
              console.error('Error reading clipboard:', error);
              sendResponse(message.id, { text: '' });
            });
            break;

          case 'natively.clipboard.write':
            navigator.clipboard.writeText(message.payload?.text || '').then(() => {
              sendResponse(message.id, { success: true });
            }).catch((error) => {
              console.error('Error writing clipboard:', error);
              sendResponse(message.id, { success: false });
            });
            break;

          case 'natively.share':
            if (navigator.share) {
              navigator.share({
                title: message.payload?.title,
                text: message.payload?.text,
                url: message.payload?.url,
              }).then(() => {
                sendResponse(message.id, { success: true });
              }).catch((error) => {
                console.error('Error sharing:', error);
                sendResponse(message.id, { success: false });
              });
            } else {
              console.log('Web Share API not supported');
              sendResponse(message.id, { success: false });
            }
            break;

          default:
            console.log('Unknown message type:', message.type);
        }
      } catch (error) {
        console.error('Error handling iframe message:', error);
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const sendResponse = (messageId: string, data: any) => {
    const iframe = document.getElementById('shopwell-iframe') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({
        id: messageId,
        ...data,
      }, WEBSITE_URL);
    }
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
    
    // Inject the natively bridge into the iframe
    const iframe = document.getElementById('shopwell-iframe') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      const script = `
        (function() {
          window.isNativeApp = true;
          window.nativelyMessageHandlers = {};
          
          window.natively = {
            haptic: {
              trigger: function(type) {
                return new Promise((resolve) => {
                  const messageId = 'msg_' + Date.now() + '_' + Math.random();
                  window.nativelyMessageHandlers[messageId] = resolve;
                  window.parent.postMessage({
                    type: 'natively.haptic.trigger',
                    id: messageId,
                    payload: { type: type || 'medium' }
                  }, '*');
                });
              }
            },
            clipboard: {
              read: function() {
                return new Promise((resolve) => {
                  const messageId = 'msg_' + Date.now() + '_' + Math.random();
                  window.nativelyMessageHandlers[messageId] = resolve;
                  window.parent.postMessage({
                    type: 'natively.clipboard.read',
                    id: messageId
                  }, '*');
                });
              },
              write: function(text) {
                return new Promise((resolve) => {
                  const messageId = 'msg_' + Date.now() + '_' + Math.random();
                  window.nativelyMessageHandlers[messageId] = resolve;
                  window.parent.postMessage({
                    type: 'natively.clipboard.write',
                    id: messageId,
                    payload: { text: text }
                  }, '*');
                });
              }
            },
            share: function(data) {
              return new Promise((resolve) => {
                const messageId = 'msg_' + Date.now() + '_' + Math.random();
                window.nativelyMessageHandlers[messageId] = resolve;
                window.parent.postMessage({
                  type: 'natively.share',
                  id: messageId,
                  payload: data
                }, '*');
              });
            },
            imagePicker: function() {
              return new Promise((resolve) => {
                console.log('Image picker not supported on web');
                resolve({ uri: null });
              });
            },
            notification: {
              register: function() {
                return new Promise((resolve) => {
                  console.log('Notifications not supported on web');
                  resolve({ success: false });
                });
              },
              getToken: function() {
                return new Promise((resolve) => {
                  resolve({ token: null });
                });
              }
            }
          };
          
          // Listen for responses from parent
          window.addEventListener('message', function(event) {
            if (event.data.id && window.nativelyMessageHandlers[event.data.id]) {
              window.nativelyMessageHandlers[event.data.id](event.data);
              delete window.nativelyMessageHandlers[event.data.id];
            }
          });
          
          console.log('Natively bridge initialized (web)');
        })();
      `;
      
      // Note: We can't directly inject scripts into cross-origin iframes
      // The website itself needs to include this bridge code
      console.log('Bridge script ready for injection');
    }
  };

  return (
    <View style={styles.container}>
      <div style={styles.iframeContainer}>
        <iframe
          id="shopwell-iframe"
          src={WEBSITE_URL}
          style={styles.iframe}
          onLoad={handleIframeLoad}
          allow="camera; microphone; clipboard-read; clipboard-write"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
        />
      </div>
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading ShopWell.ai...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  iframeContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  iframe: {
    width: '100%',
    height: '100%',
    border: 'none',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text,
  },
});
