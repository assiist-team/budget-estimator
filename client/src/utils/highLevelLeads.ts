interface LeadInput {
  firstName: string;
  email: string;
  phone?: string;
}

export async function syncLeadToHighLevel(lead: LeadInput): Promise<boolean> {
  const token = import.meta.env.VITE_HIGHLEVEL_TOKEN;
  const locationId = import.meta.env.VITE_HIGHLEVEL_LOCATION_ID;

  if (!token || !locationId) {
    console.warn('High Level credentials not configured');
    return false;
  }

  try {
    // Search by email
    const searchResponse = await fetch(
      `https://rest.gohighlevel.com/v1/contacts/?locationId=${locationId}&email=${encodeURIComponent(lead.email)}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Version': '2021-07-28'
        }
      }
    );
    if (!searchResponse.ok) throw new Error(`HighLevel search error: ${searchResponse.status}`);
    const searchData = await searchResponse.json();
    const existingContacts = searchData.contacts || [];

    const contactPayload: any = {
      locationId,
      email: lead.email,
      firstName: lead.firstName,
      ...(lead.phone ? { phone: lead.phone } : {}),
    };

    if (existingContacts.length > 0) {
      const contactId = existingContacts[0].id;
      const updateResp = await fetch(`https://rest.gohighlevel.com/v1/contacts/${contactId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactPayload),
      });
      if (!updateResp.ok) throw new Error(`HighLevel update error: ${updateResp.status}`);
      return true;
    }

    const createResp = await fetch('https://rest.gohighlevel.com/v1/contacts/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(contactPayload),
    });
    if (!createResp.ok) throw new Error(`HighLevel create error: ${createResp.status}`);
    return true;
  } catch (err) {
    console.warn('High Level lead sync failed', err);
    return false;
  }
}


