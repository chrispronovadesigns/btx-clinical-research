#!/usr/bin/env node
/**
 * Broadcast push notification to all subscribers.
 *
 * Usage:
 *   node scripts/broadcast.js "New blog post" "We published a new article." "/blog/new-post/"
 *
 * Requires PUSH_SEND_SECRET env var. If running locally, you can prefix:
 *   PUSH_SEND_SECRET=your_secret node scripts/broadcast.js ...
 *
 * Or load from .env (if you have dotenv installed):
 *   require('dotenv').config()
 */

const API_URL = process.env.PUSH_API_URL || 'https://example.com/api/push/send';
const SEND_SECRET = process.env.PUSH_SEND_SECRET;

function showUsage() {
  console.log(`
Usage: node scripts/broadcast.js <title> <body> [url] [icon]

Examples:
  node scripts/broadcast.js "New blog post" "Check out our latest article." "/blog/new-post/"
  PUSH_SEND_SECRET=xxx node scripts/broadcast.js "Holiday hours" "We are closed Dec 24-26." "/contact/"
`);
}

async function main() {
  const [, , title, body, url = '/', icon] = process.argv;

  if (!SEND_SECRET) {
    console.error('Error: PUSH_SEND_SECRET env var is required.');
    console.error('Set it in your environment or prefix the command:\n');
    console.error('  PUSH_SEND_SECRET=your_secret node scripts/broadcast.js ...\n');
    process.exit(1);
  }

  if (!title || !body) {
    console.error('Error: title and body are required.\n');
    showUsage();
    process.exit(1);
  }

  const payload = { title, body, url, icon };
  if (!icon) delete payload.icon;

  console.log(`Broadcasting to ${API_URL}...`);
  console.log(`Title: ${title}`);
  console.log(`Body:  ${body}`);
  console.log(`URL:   ${url}`);
  console.log('');

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SEND_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error(`Error: HTTP ${res.status}`);
      console.error(data.error || 'Unknown error');
      process.exit(1);
    }

    if (data.sent !== undefined) {
      console.log(`Sent:        ${data.sent}`);
      console.log(`Failed:      ${data.failed}`);
      if (data.subscribers !== undefined) console.log(`Subscribers: ${data.subscribers}`);
      if (data.message) console.log(`Note:        ${data.message}`);

      if (data.errors && data.errors.length > 0) {
        console.log('\nErrors:');
        data.errors.forEach((e, i) => {
          console.log(`  ${i + 1}. Status: ${e.statusCode || 'unknown'} | ${e.message}`);
          if (e.endpoint) console.log(`     Endpoint: ${e.endpoint}`);
        });
      }
    } else {
      console.log('Response:', JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    if (err.cause) console.error(err.cause);
    process.exit(1);
  }
}

main();
