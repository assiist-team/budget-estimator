const HIGHLEVEL_API_ENDPOINT = 'https://services.leadconnectorhq.com/contacts/upsert';

interface LeadInput {
  firstName: string;
  email: string;
  phone?: string;
  source?: string;
}

export async function syncLeadToHighLevel(lead: LeadInput): Promise<boolean> {
  const token = import.meta.env.VITE_HIGHLEVEL_TOKEN;
  const locationId = import.meta.env.VITE_HIGHLEVEL_LOCATION_ID;

  if (!token || !locationId) {
    console.warn('High Level credentials not configured');
    return false;
  }

  const contactPayload = {
    firstName: lead.firstName,
    email: lead.email,
    ...(lead.phone && { phone: lead.phone }),
    source: lead.source || 'Website Lead Form',
    locationId: locationId
  };

  try {
    const response = await fetch(HIGHLEVEL_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Version': '2021-07-28'
      },
      body: JSON.stringify(contactPayload)
    });

    if (!response.ok) {
      const responseBody = await response.text();
      throw new Error(`HighLevel API error: ${response.status} ${responseBody}`);
    }

    console.log('HighLevel lead sync successful for:', lead.email);
    return true;
  } catch (err) {
    console.error('High Level lead sync failed', err);
    return false;
  }
}


