
import * as Contacts from 'expo-contacts';
import { Platform, Alert } from 'react-native';

export interface Contact {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phoneNumbers?: string[];
  emails?: string[];
  imageAvailable?: boolean;
}

/**
 * Request permission to access contacts with proper Android handling
 */
export async function requestContactsPermission(): Promise<boolean> {
  try {
    console.log('[ContactsHandler] Requesting contacts permission...');
    
    // Check current permission status first
    const { status: currentStatus } = await Contacts.getPermissionsAsync();
    console.log('[ContactsHandler] Current permission status:', currentStatus);
    
    if (currentStatus === 'granted') {
      console.log('[ContactsHandler] Permission already granted');
      return true;
    }
    
    // Request permission - this will show the system dialog on both platforms
    console.log('[ContactsHandler] Requesting permission from system...');
    const { status } = await Contacts.requestPermissionsAsync();
    console.log('[ContactsHandler] Permission result:', status);
    
    if (status !== 'granted') {
      // Show user-friendly message if permission was denied
      Alert.alert(
        'Permission Required',
        'Please grant contacts permission in your device settings to import contacts.',
        [{ text: 'OK' }]
      );
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[ContactsHandler] Error requesting contacts permission:', error);
    Alert.alert(
      'Error',
      'Failed to request contacts permission. Please try again.',
      [{ text: 'OK' }]
    );
    return false;
  }
}

/**
 * Get all contacts from the device
 */
export async function getAllContacts(): Promise<Contact[]> {
  try {
    console.log('[ContactsHandler] Fetching all contacts...');
    const { status } = await Contacts.getPermissionsAsync();
    
    if (status !== 'granted') {
      console.log('[ContactsHandler] Contacts permission not granted, requesting...');
      const granted = await requestContactsPermission();
      if (!granted) {
        console.log('[ContactsHandler] Contacts permission denied');
        return [];
      }
    }

    const { data } = await Contacts.getContactsAsync({
      fields: [
        Contacts.Fields.Name,
        Contacts.Fields.FirstName,
        Contacts.Fields.LastName,
        Contacts.Fields.PhoneNumbers,
        Contacts.Fields.Emails,
        Contacts.Fields.ImageAvailable,
      ],
    });

    console.log(`[ContactsHandler] Fetched ${data.length} contacts`);

    // Transform contacts to our format
    const contacts: Contact[] = data.map((contact) => ({
      id: contact.id,
      name: contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unknown',
      firstName: contact.firstName,
      lastName: contact.lastName,
      phoneNumbers: contact.phoneNumbers?.map((phone) => phone.number || '') || [],
      emails: contact.emails?.map((email) => email.email || '') || [],
      imageAvailable: contact.imageAvailable,
    }));

    return contacts;
  } catch (error) {
    console.error('[ContactsHandler] Error fetching contacts:', error);
    return [];
  }
}

/**
 * Search contacts by name
 */
export async function searchContacts(query: string): Promise<Contact[]> {
  try {
    console.log('[ContactsHandler] Searching contacts with query:', query);
    const allContacts = await getAllContacts();
    
    const lowerQuery = query.toLowerCase();
    const filtered = allContacts.filter((contact) => {
      const nameMatch = contact.name.toLowerCase().includes(lowerQuery);
      const firstNameMatch = contact.firstName?.toLowerCase().includes(lowerQuery);
      const lastNameMatch = contact.lastName?.toLowerCase().includes(lowerQuery);
      return nameMatch || firstNameMatch || lastNameMatch;
    });

    console.log(`[ContactsHandler] Found ${filtered.length} matching contacts`);
    return filtered;
  } catch (error) {
    console.error('[ContactsHandler] Error searching contacts:', error);
    return [];
  }
}

/**
 * Pick a single contact using the native contact picker
 */
export async function pickContact(): Promise<Contact | null> {
  try {
    console.log('[ContactsHandler] Opening contact picker...');
    
    // Request permission first
    const { status } = await Contacts.getPermissionsAsync();
    if (status !== 'granted') {
      console.log('[ContactsHandler] Contacts permission not granted, requesting...');
      const granted = await requestContactsPermission();
      if (!granted) {
        console.log('[ContactsHandler] Contacts permission denied');
        return null;
      }
    }

    // Use presentContactPickerAsync if available (iOS)
    if (Platform.OS === 'ios' && Contacts.presentContactPickerAsync) {
      const result = await Contacts.presentContactPickerAsync();
      
      if (result && result.id) {
        // Transform to our Contact format
        const contact: Contact = {
          id: result.id,
          name: result.name || `${result.firstName || ''} ${result.lastName || ''}`.trim() || 'Unknown',
          firstName: result.firstName,
          lastName: result.lastName,
          phoneNumbers: result.phoneNumbers?.map((phone) => phone.number || '') || [],
          emails: result.emails?.map((email) => email.email || '') || [],
          imageAvailable: result.imageAvailable,
        };
        
        console.log('[ContactsHandler] Contact picked:', contact.name);
        return contact;
      }
    } else {
      // Android: Get all contacts and return the first one
      // In a real implementation, you'd show a custom picker UI
      console.log('[ContactsHandler] Native picker not available on Android, fetching contacts...');
      const allContacts = await getAllContacts();
      
      if (allContacts.length > 0) {
        console.log('[ContactsHandler] Returning first contact as fallback');
        return allContacts[0];
      }
    }

    console.log('[ContactsHandler] No contact selected');
    return null;
  } catch (error) {
    console.error('[ContactsHandler] Error picking contact:', error);
    Alert.alert(
      'Error',
      'Failed to access contacts. Please check your permissions.',
      [{ text: 'OK' }]
    );
    return null;
  }
}

/**
 * Check if contacts permission is granted
 */
export async function hasContactsPermission(): Promise<boolean> {
  try {
    const { status } = await Contacts.getPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('[ContactsHandler] Error checking contacts permission:', error);
    return false;
  }
}
