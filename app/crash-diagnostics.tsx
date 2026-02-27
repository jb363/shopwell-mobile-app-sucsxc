
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import { getCrashReports, clearCrashReports } from '@/utils/crashReporter';
import { colors } from '@/styles/commonStyles';

export default function CrashDiagnosticsScreen() {
  const [crashes, setCrashes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCrashes();
  }, []);

  const loadCrashes = async () => {
    try {
      setLoading(true);
      const reports = await getCrashReports();
      setCrashes(reports);
      console.log('[CrashDiagnostics] Loaded crash reports:', reports.length);
    } catch (error) {
      console.error('[CrashDiagnostics] Error loading crash reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearCrashes = async () => {
    try {
      await clearCrashReports();
      setCrashes([]);
      console.log('[CrashDiagnostics] Cleared all crash reports');
    } catch (error) {
      console.error('[CrashDiagnostics] Error clearing crash reports:', error);
    }
  };

  const handleShareCrashes = async () => {
    try {
      const crashData = JSON.stringify(crashes, null, 2);
      await Share.share({
        message: `ShopWell.ai Crash Reports (${crashes.length} crashes)\n\n${crashData}`,
        title: 'Crash Reports',
      });
    } catch (error) {
      console.error('[CrashDiagnostics] Error sharing crash reports:', error);
    }
  };

  const loadingText = 'Loading crash reports...';
  const noCrashesText = 'No crashes detected! 🎉';
  const crashCountText = `${crashes.length} crash${crashes.length === 1 ? '' : 'es'} detected`;

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Crash Diagnostics',
          headerBackTitle: 'Back',
        }} 
      />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {loading ? (
          <Text style={styles.loadingText}>{loadingText}</Text>
        ) : crashes.length === 0 ? (
          <View style={styles.noCrashesContainer}>
            <Text style={styles.noCrashesText}>{noCrashesText}</Text>
            <Text style={styles.infoText}>
              The app is running smoothly. If you experience a crash, it will be logged here for debugging.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.header}>
              <Text style={styles.headerText}>{crashCountText}</Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.shareButton} onPress={handleShareCrashes}>
                  <Text style={styles.shareButtonText}>Share</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.clearButton} onPress={handleClearCrashes}>
                  <Text style={styles.clearButtonText}>Clear</Text>
                </TouchableOpacity>
              </View>
            </View>

            {crashes.map((crash, index) => {
              const crashNumber = `Crash ${index + 1}`;
              const deviceText = `${crash.deviceInfo.brand} ${crash.deviceInfo.modelName}`;
              const osText = `${crash.deviceInfo.osName} ${crash.deviceInfo.osVersion}`;
              const appVersionText = `v${crash.appInfo.version} (${crash.appInfo.buildNumber})`;
              const isFatalText = crash.context?.isFatal ? 'FATAL' : 'Non-Fatal';
              const locationText = crash.context?.location || 'Unknown';

              return (
                <View key={index} style={styles.crashCard}>
                  <Text style={styles.crashTitle}>{crashNumber}</Text>
                  <Text style={styles.crashTimestamp}>{crash.timestamp}</Text>
                  
                  <View style={styles.crashSection}>
                    <Text style={styles.sectionTitle}>Device Info</Text>
                    <Text style={styles.crashDetail}>{deviceText}</Text>
                    <Text style={styles.crashDetail}>{osText}</Text>
                    <Text style={styles.crashDetail}>{appVersionText}</Text>
                  </View>

                  <View style={styles.crashSection}>
                    <Text style={styles.sectionTitle}>Error Details</Text>
                    <Text style={styles.errorName}>{crash.error.name}</Text>
                    <Text style={styles.errorMessage}>{crash.error.message}</Text>
                    {crash.context?.isFatal !== undefined && (
                      <Text style={[styles.fatalBadge, crash.context.isFatal && styles.fatalBadgeRed]}>
                        {isFatalText}
                      </Text>
                    )}
                    {crash.context?.location && (
                      <Text style={styles.crashDetail}>Location: {locationText}</Text>
                    )}
                  </View>

                  {crash.error.stack && (
                    <View style={styles.crashSection}>
                      <Text style={styles.sectionTitle}>Stack Trace</Text>
                      <ScrollView horizontal style={styles.stackScrollView}>
                        <Text style={styles.stackTrace}>{crash.error.stack}</Text>
                      </ScrollView>
                    </View>
                  )}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    marginTop: 40,
  },
  noCrashesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  noCrashesText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    color: colors.text,
    opacity: 0.7,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  header: {
    marginBottom: 20,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  shareButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  clearButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  crashCard: {
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
  },
  crashTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  crashTimestamp: {
    fontSize: 12,
    color: colors.text,
    opacity: 0.6,
    marginBottom: 12,
  },
  crashSection: {
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
    opacity: 0.8,
  },
  crashDetail: {
    fontSize: 13,
    color: colors.text,
    marginBottom: 2,
  },
  errorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF3B30',
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 13,
    color: colors.text,
    marginBottom: 8,
  },
  fatalBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#34C759',
    marginTop: 4,
  },
  fatalBadgeRed: {
    color: '#FF3B30',
  },
  stackScrollView: {
    maxHeight: 150,
  },
  stackTrace: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: colors.text,
    opacity: 0.8,
  },
});
