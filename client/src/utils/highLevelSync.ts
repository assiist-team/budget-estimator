// High Level CRM Integration
// Syncs estimate submissions to High Level CRM

const HIGHLEVEL_API_ENDPOINT = 'https://services.leadconnectorhq.com/contacts/upsert';

async function upsertHighLevelContact(payload: any): Promise<boolean> {
  const token = import.meta.env.VITE_HIGHLEVEL_TOKEN;
  const locationId = import.meta.env.VITE_HIGHLEVEL_LOCATION_ID;

  if (!token || !locationId) {
    console.warn('High Level credentials not configured');
    return false;
  }

  if (!payload.email) {
    console.warn('HighLevel sync skipped: contact email is missing.');
    return false;
  }

  const allowedPayload: { [key: string]: any } = {
    locationId,
    email: payload.email,
    customFields: payload.customFields
  };

  if (payload.firstName) allowedPayload.firstName = payload.firstName;
  if (payload.lastName) allowedPayload.lastName = payload.lastName;
  if (payload.phone) allowedPayload.phone = payload.phone;


  try {
    const response = await fetch(HIGHLEVEL_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Version': '2021-07-28'
      },
      body: JSON.stringify(allowedPayload)
    });

    if (!response.ok) {
      const responseBody = await response.text();
      throw new Error(`HighLevel API error: ${response.status} ${responseBody}`);
    }

    const result = await response.json();
    console.log('HighLevel contact upsert successful:', result);
    return true;
  } catch (error) {
    console.error('High Level sync failed:', error);
    return false;
  }
}

export async function syncToHighLevel(estimate: any, estimateId: string): Promise<boolean> {
  const estimateUrl = `${window.location.origin}/tools/budget-estimator/estimate/view/${estimateId}`;

  const contactData = {
    firstName: estimate.clientInfo.firstName,
    ...(estimate.clientInfo?.lastName && { lastName: estimate.clientInfo.lastName }),
    email: estimate.clientInfo.email,
    ...(estimate.clientInfo.phone && { phone: estimate.clientInfo.phone }),
    customFields: [
      {
        key: 'vacation_rental_estimate',
        field_value: estimateUrl
      }
    ]
  };

  return await upsertHighLevelContact(contactData);
}

// ROI Projection sync (optional, mirrors estimate sync with ROI link)
export async function syncRoiToHighLevel(
  payload: { clientInfo: { email: string; firstName?: string | null; lastName?: string | null; phone?: string | null } | null },
  projectionId: string
): Promise<boolean> {
  if (!payload.clientInfo) {
    return false;
  }

  const projectionUrl = `${window.location.origin}/tools/roi-estimator/projection/view/${projectionId}`;

  const contactData = {
    ...(payload.clientInfo.firstName && { firstName: payload.clientInfo.firstName }),
    ...(payload.clientInfo.lastName && { lastName: payload.clientInfo.lastName }),
    email: payload.clientInfo.email,
    ...(payload.clientInfo.phone && { phone: payload.clientInfo.phone }),
    customFields: [
      {
        key: 'vacation_rental_projection',
        field_value: projectionUrl
      }
    ]
  };

  return await upsertHighLevelContact(contactData);
}
