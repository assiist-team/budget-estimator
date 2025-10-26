// High Level CRM Integration
// Syncs estimate submissions to High Level CRM


export async function syncToHighLevel(estimate: any, estimateId: string): Promise<boolean> {
  const token = import.meta.env.VITE_HIGHLEVEL_TOKEN;
  const locationId = import.meta.env.VITE_HIGHLEVEL_LOCATION_ID;

  if (!token || !locationId) {
    console.warn('High Level credentials not configured');
    return false;
  }

  try {
    const estimateUrl = `${window.location.origin}/tools/budget-estimator/estimate/view/${estimateId}`;

    // First, try to find existing contact by email
    const searchResponse = await fetch(
      `https://rest.gohighlevel.com/v1/contacts/?locationId=${locationId}&email=${encodeURIComponent(estimate.clientInfo.email)}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Version': '2021-07-28'
        }
      }
    );

    if (!searchResponse.ok) {
      throw new Error(`High Level API error: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    const existingContacts = searchData.contacts || [];

    const contactData = {
      locationId: locationId,
      email: estimate.clientInfo.email,
      firstName: estimate.clientInfo.firstName,
      lastName: estimate.clientInfo.lastName,
      ...(estimate.clientInfo.phone && { phone: estimate.clientInfo.phone }),
      customField: {
        estimate_vacation_rental: estimateUrl
      }
    };

    if (existingContacts.length > 0) {
      // Update existing contact
      const contactId = existingContacts[0].id;
      const updateResponse = await fetch(`https://rest.gohighlevel.com/v1/contacts/${contactId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28'
        },
        body: JSON.stringify(contactData)
      });

      if (!updateResponse.ok) {
        throw new Error(`Failed to update contact: ${updateResponse.status}`);
      }

      console.log('Updated existing High Level contact:', contactId);
    } else {
      // Create new contact
      const createResponse = await fetch('https://rest.gohighlevel.com/v1/contacts/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28'
        },
        body: JSON.stringify(contactData)
      });

      if (!createResponse.ok) {
        throw new Error(`Failed to create contact: ${createResponse.status}`);
      }

      console.log('Created new High Level contact for:', estimate.clientInfo.email);
    }

    return true;
  } catch (error) {
    console.error('High Level sync failed:', error);
    // Don't fail the estimate submission - just log the error
    return false;
  }
}

// ROI Projection sync (optional, mirrors estimate sync with ROI link)
export async function syncRoiToHighLevel(payload: { contact: { email: string; firstName?: string | null; phone?: string | null } | null }, projectionId: string): Promise<boolean> {
  const token = import.meta.env.VITE_HIGHLEVEL_TOKEN;
  const locationId = import.meta.env.VITE_HIGHLEVEL_LOCATION_ID;

  if (!token || !locationId) {
    console.warn('High Level credentials not configured');
    return false;
  }

  if (!payload.contact?.email) {
    return false;
  }

  try {
    const projectionUrl = `${window.location.origin}/tools/roi-estimator/projection/view/${projectionId}`;

    // First, try to find existing contact by email
    const searchResponse = await fetch(
      `https://rest.gohighlevel.com/v1/contacts/?locationId=${locationId}&email=${encodeURIComponent(payload.contact.email)}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Version': '2021-07-28'
        }
      }
    );

    if (!searchResponse.ok) {
      throw new Error(`High Level API error: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    const existingContacts = searchData.contacts || [];

    const contactData: any = {
      locationId: locationId,
      email: payload.contact.email,
      ...(payload.contact.firstName ? { firstName: payload.contact.firstName } : {}),
      ...(payload.contact.phone ? { phone: payload.contact.phone } : {}),
      customField: {
        vacation_rental_projection: projectionUrl
      }
    };

    if (existingContacts.length > 0) {
      // Update existing contact
      const contactId = existingContacts[0].id;
      const updateResponse = await fetch(`https://rest.gohighlevel.com/v1/contacts/${contactId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28'
        },
        body: JSON.stringify(contactData)
      });

      if (!updateResponse.ok) {
        throw new Error(`Failed to update contact: ${updateResponse.status}`);
      }

      console.log('Updated existing High Level contact for ROI:', contactId);
    } else {
      // Create new contact
      const createResponse = await fetch('https://rest.gohighlevel.com/v1/contacts/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28'
        },
        body: JSON.stringify(contactData)
      });

      if (!createResponse.ok) {
        throw new Error(`Failed to create contact: ${createResponse.status}`);
      }

      console.log('Created new High Level contact for ROI:', payload.contact.email);
    }

    return true;
  } catch (error) {
    console.error('High Level ROI sync failed:', error);
    return false;
  }
}
