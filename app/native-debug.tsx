
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

interface NativeMessage {
  timestamp: string;
  type: string;
  data: any;
  source: 'incoming' | 'outgoing';
}

export default function NativeDebugScreen() {
  const [messages, setMessages] = useState<NativeMessage[]>([]);
  const [isListening, setIsListening] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    console.log('[NativeDebug] 🔍 Debug screen mounted');

    // Listen for window messages (from WebView or native bridge)
    const handleMessage = (event: MessageEvent) => {
      if (!isListening) return;

      console.log('[NativeDebug] 📩 Message received:', event.data);

      const newMessage: NativeMessage = {
        timestamp: new Date().toISOString(),
        type: event.data?.type || 'unknown',
        data: event.data,
        source: 'incoming',
      };

      setMessages((prev) => [...prev, newMessage]);

      // Auto-scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    };

    // Add event listener
    if (typeof window !== 'undefined') {
      window.addEventListener('message', handleMessage as any);
    }

    // Log initial state
    const initialMessage: NativeMessage = {
      timestamp: new Date().toISOString(),
      type: 'DEBUG_STARTED',
      data: {
        platform: Platform.OS,
        version: Platform.Version,
        isNative: Platform.OS !== 'web',
      },
      source: 'outgoing',
    };
    setMessages([initialMessage]);

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('message', handleMessage as any);
      }
    };
  }, [isListening]);

  const clearMessages = () => {
    console.log('[NativeDebug] 🗑️ Clearing messages');
    setMessages([]);
  };

  const toggleListening = () => {
    const newState = !isListening;
    setIsListening(newState);
    console.log('[NativeDebug] 🎧 Listening:', newState);

    const statusMessage: NativeMessage = {
      timestamp: new Date().toISOString(),
      type: newState ? 'LISTENING_ENABLED' : 'LISTENING_DISABLED',
      data: { listening: newState },
      source: 'outgoing',
    };
    setMessages((prev) => [...prev, statusMessage]);
  };

  const testShareIntent = () => {
    console.log('[NativeDebug] 🧪 Testing share intent simulation');

    const testMessage: NativeMessage = {
      timestamp: new Date().toISOString(),
      type: 'TEST_SHARE_INTENT',
      data: {
        action: 'android.intent.action.SEND',
        mimeType: 'text/plain',
        text: 'https://example.com/test-product',
        note: 'This is a simulated share intent for testing',
      },
      source: 'outgoing',
    };

    setMessages((prev) => [...prev, testMessage]);

    // Simulate navigation to share-target
    setTimeout(() => {
      router.push({
        pathname: '/share-target',
        params: {
          text: 'https://example.com/test-product',
          type: 'url',
        },
      });
    }, 1000);
  };

  const testPushToken = () => {
    console.log('[NativeDebug] 🧪 Testing push token simulation');

    const testMessage: NativeMessage = {
      timestamp: new Date().toISOString(),
      type: 'TEST_PUSH_TOKEN',
      data: {
        token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        platform: Platform.OS,
        note: 'This is a simulated push token for testing',
      },
      source: 'outgoing',
    };

    setMessages((prev) => [...prev, testMessage]);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const ms = date.getMilliseconds().toString().padStart(3, '0');
    return `${hours}:${minutes}:${seconds}.${ms}`;
  };

  const getMessageColor = (source: 'incoming' | 'outgoing') => {
    return source === 'incoming' ? '#4CAF50' : '#2196F3';
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Native Bridge Debug',
          headerShown: true,
          headerBackTitle: 'Back',
        }}
      />

      <View style={styles.container}>
        {/* Header Controls */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: isListening ? '#f44336' : '#4CAF50' }]}
            onPress={toggleListening}
          >
            <IconSymbol
              ios_icon_name={isListening ? 'pause.circle.fill' : 'play.circle.fill'}
              android_material_icon_name={isListening ? 'pause' : 'play-arrow'}
              size={20}
              color="#ffffff"
            />
            <Text style={styles.buttonText}>
              {isListening ? 'Pause' : 'Resume'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#FF9800' }]}
            onPress={clearMessages}
          >
            <IconSymbol
              ios_icon_name="trash.fill"
              android_material_icon_name="delete"
              size={20}
              color="#ffffff"
            />
            <Text style={styles.buttonText}>Clear</Text>
          </TouchableOpacity>
        </View>

        {/* Test Actions */}
        <View style={styles.testSection}>
          <Text style={styles.sectionTitle}>Test Actions</Text>
          <View style={styles.testButtons}>
            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: '#9C27B0' }]}
              onPress={testShareIntent}
            >
              <IconSymbol
                ios_icon_name="square.and.arrow.up"
                android_material_icon_name="share"
                size={18}
                color="#ffffff"
              />
              <Text style={styles.testButtonText}>Share Intent</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: '#FF5722' }]}
              onPress={testPushToken}
            >
              <IconSymbol
                ios_icon_name="bell.fill"
                android_material_icon_name="notifications"
                size={18}
                color="#ffffff"
              />
              <Text style={styles.testButtonText}>Push Token</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Messages List */}
        <View style={styles.messagesContainer}>
          <Text style={styles.sectionTitle}>
            Messages ({messages.length})
          </Text>

          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesContent}
          >
            {messages.length === 0 ? (
              <View style={styles.emptyState}>
                <IconSymbol
                  ios_icon_name="antenna.radiowaves.left.and.right"
                  android_material_icon_name="wifi"
                  size={48}
                  color="#cccccc"
                />
                <Text style={styles.emptyText}>
                  Waiting for native messages...
                </Text>
                <Text style={styles.emptySubtext}>
                  Share content or trigger push notifications to see messages here
                </Text>
              </View>
            ) : (
              messages.map((message, index) => (
                <View
                  key={index}
                  style={[
                    styles.messageCard,
                    { borderLeftColor: getMessageColor(message.source) },
                  ]}
                >
                  <View style={styles.messageHeader}>
                    <Text
                      style={[
                        styles.messageType,
                        { color: getMessageColor(message.source) },
                      ]}
                    >
                      {message.type}
                    </Text>
                    <Text style={styles.messageTimestamp}>
                      {formatTimestamp(message.timestamp)}
                    </Text>
                  </View>

                  <View style={styles.messageSource}>
                    <IconSymbol
                      ios_icon_name={
                        message.source === 'incoming'
                          ? 'arrow.down.circle.fill'
                          : 'arrow.up.circle.fill'
                      }
                      android_material_icon_name={
                        message.source === 'incoming'
                          ? 'arrow-downward'
                          : 'arrow-upward'
                      }
                      size={14}
                      color={getMessageColor(message.source)}
                    />
                    <Text
                      style={[
                        styles.messageSourceText,
                        { color: getMessageColor(message.source) },
                      ]}
                    >
                      {message.source}
                    </Text>
                  </View>

                  <Text style={styles.messageData}>
                    {JSON.stringify(message.data, null, 2)}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
        </View>

        {/* Info Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Platform: {Platform.OS} • Version: {Platform.Version}
          </Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 8,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  testSection: {
    padding: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 8,
  },
  testButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  testButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 6,
  },
  testButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  messagesContainer: {
    flex: 1,
    padding: 12,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingBottom: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#cccccc',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  messageCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  messageType: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  messageTimestamp: {
    fontSize: 11,
    color: '#999999',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  messageSource: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  messageSourceText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  messageData: {
    fontSize: 12,
    color: '#333333',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    backgroundColor: '#f9f9f9',
    padding: 8,
    borderRadius: 4,
  },
  footer: {
    padding: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999999',
  },
});
