
import * as Contacts from 'expo-contacts';
import { Platform } from 'react-native';

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
 * Request permission to access contacts
 */
export async function requestContactsPermission(): Promise<boolean> {
  try {
    console.log('Requesting contacts permission...');
    const { status } = await Contacts.requestPermissionsAsync();
    console.log('Contacts permission status:', status);
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting contacts permission:', error);
    return false;
  }
}

/**
 * Get all contacts from the device
 */
export async function getAllContacts(): Promise<Contact[]> {
  try {
    console.log('Fetching all contacts...');
    const { status } = await Contacts.getPermissionsAsync();
    
    if (status !== 'granted') {
      console.log('Contacts permission not granted, requesting...');
      const granted = await requestContactsPermission();
      if (!granted) {
        console.log('Contacts permission denied');
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

    console.log(`Fetched ${data.length} contacts`);

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
    console.error('Error fetching contacts:', error);
    return [];
  }
}

/**
 * Search contacts by name
 */
export async function searchContacts(query: string): Promise<Contact[]> {
  try {
    console.log('Searching contacts with query:', query);
    const allContacts = await getAllContacts();
    
    const lowerQuery = query.toLowerCase();
    const filtered = allContacts.filter((contact) => {
      const nameMatch = contact.name.toLowerCase().includes(lowerQuery);
      const firstNameMatch = contact.firstName?.toLowerCase().includes(lowerQuery);
      const lastNameMatch = contact.lastName?.toLowerCase().includes(lowerQuery);
      return nameMatch || firstNameMatch || lastNameMatch;
    });

    console.log(`Found ${filtered.length} matching contacts`);
    return filtered;
  } catch (error) {
    console.error('Error searching contacts:', error);
    return [];
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
    console.error('Error checking contacts permission:', error);
    return false;
  }
}
