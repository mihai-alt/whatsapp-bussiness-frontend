export function parseNotificationMeta(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function idOf(meta, ...keys) {
  for (const key of keys) {
    const n = Number(meta?.[key]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

/**
 * Map a notification to the page where the event happened.
 * Falls back to a sensible list page when a specific record id is missing.
 */
export function notificationHref(notification) {
  if (!notification) return null;
  const meta = parseNotificationMeta(notification.meta);
  if (typeof meta.path === 'string' && meta.path.startsWith('/')) return meta.path;
  if (typeof meta.href === 'string' && meta.href.startsWith('/')) return meta.href;

  const type = String(notification.type || '').toLowerCase();
  const nid = notification.id ? `&n=${notification.id}` : '';
  const groupId = idOf(meta, 'groupId', 'group_id');
  const campaignId = idOf(meta, 'campaignId', 'campaign_id');
  const contactId = idOf(meta, 'contactId', 'contact_id');
  const templateName = meta.templateName || meta.name || '';

  if (type.includes('group') || type.includes('contact_group')) {
    return groupId ? `/groups?groupId=${groupId}${nid}` : '/groups';
  }
  if (type.includes('failed_message')) {
    return campaignId ? `/reports/campaigns/${campaignId}` : '/reports/failed';
  }
  if (type.includes('campaign')) {
    return campaignId ? `/campaigns/${campaignId}` : '/campaigns';
  }
  if (type.includes('low_wallet')) {
    return campaignId ? `/campaigns/${campaignId}` : '/wallet';
  }
  if (type.includes('number_')) {
    return '/whatsapp';
  }
  if (type.includes('template')) {
    const q = templateName ? `?q=${encodeURIComponent(String(templateName))}` : '';
    return `/templates${q}`;
  }
  if (type.includes('contact')) {
    if (contactId) return `/contacts?contactId=${contactId}${nid}`;
    if (groupId) return `/contacts?groupId=${groupId}`;
    return '/contacts';
  }
  if (type.includes('user') || type.includes('member')) {
    return '/users';
  }
  return null;
}
