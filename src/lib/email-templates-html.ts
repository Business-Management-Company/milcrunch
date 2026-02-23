/**
 * Pre-built responsive email HTML templates for MilCrunch Mail.
 * Each template uses table-based layout with inline styles for email client compatibility.
 * Variables: {{first_name}}, {{email}}, {{unsubscribe_url}}, {{footer_text}}
 */

export interface BuiltInTemplate {
  name: string;
  category: string;
  description: string;
  thumbnail_color: string;
  thumbnail_image?: string;
  html: string;
}

const WRAPPER_START = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Email</title></head><body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">`;

const WRAPPER_END = `</table>
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td style="padding:24px 20px;text-align:center;color:#9ca3af;font-size:12px;line-height:18px;">
{{footer_text}}<br><a href="{{unsubscribe_url}}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a>
</td></tr></table>
</td></tr></table></body></html>`;

export const BUILT_IN_TEMPLATES: BuiltInTemplate[] = [
  {
    name: "Event Announcement",
    category: "event",
    description: "Purple header with event details and RSVP button",
    thumbnail_color: "#1e3a5f",
    thumbnail_image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=200&fit=crop",
    html: `${WRAPPER_START}
<tr><td style="background:url('https://images.unsplash.com/photo-1579192181049-30e4c148cfa0?w=600&h=200&fit=crop&crop=center') center/cover no-repeat, linear-gradient(135deg,#1e3a5f,#000741);padding:0;">
<div style="background:rgba(0,7,65,0.65);padding:48px 40px;text-align:center;">
<h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;">You're Invited!</h1>
<p style="margin:12px 0 0;color:#93c5fd;font-size:16px;">A special event just for you, {{first_name}}</p>
</div>
</td></tr>
<tr><td style="padding:40px;">
<h2 style="margin:0 0 16px;color:#111827;font-size:22px;">[Event Name]</h2>
<p style="margin:0 0 8px;color:#6b7280;font-size:15px;line-height:24px;"><strong>Date:</strong> [Event Date]</p>
<p style="margin:0 0 8px;color:#6b7280;font-size:15px;line-height:24px;"><strong>Location:</strong> [Event Location]</p>
<p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:24px;">[Event description goes here. Share what attendees can expect, who will be speaking, and why they should attend.]</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#1e3a5f;border-radius:8px;">
<a href="#" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;">RSVP Now</a>
</td></tr></table>
</td></tr>
${WRAPPER_END}`,
  },
  {
    name: "Creator Welcome",
    category: "welcome",
    description: "Welcome message with next steps and social links",
    thumbnail_color: "#10B981",
    thumbnail_image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&h=200&fit=crop",
    html: `${WRAPPER_START}
<tr><td style="background:url('https://images.unsplash.com/photo-1598128558393-70ff21f8be44?w=600&h=200&fit=crop&crop=center') center/cover no-repeat, #10B981;padding:0;">
<div style="background:rgba(5,90,60,0.7);padding:40px;text-align:center;">
<h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;">Welcome to MilCrunch!</h1>
</div>
</td></tr>
<tr><td style="padding:40px;">
<p style="margin:0 0 20px;color:#374151;font-size:16px;line-height:26px;">Hey {{first_name}},</p>
<p style="margin:0 0 20px;color:#374151;font-size:16px;line-height:26px;">We're thrilled to have you join the MilCrunch community. Here's how to get started:</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:16px;background:#f0fdf4;border-radius:8px;margin-bottom:12px;">
<p style="margin:0;color:#166534;font-size:15px;"><strong>1.</strong> Complete your creator profile</p>
</td></tr>
<tr><td style="height:8px;"></td></tr>
<tr><td style="padding:16px;background:#f0fdf4;border-radius:8px;">
<p style="margin:0;color:#166534;font-size:15px;"><strong>2.</strong> Connect your social media accounts</p>
</td></tr>
<tr><td style="height:8px;"></td></tr>
<tr><td style="padding:16px;background:#f0fdf4;border-radius:8px;">
<p style="margin:0;color:#166534;font-size:15px;"><strong>3.</strong> Browse upcoming events and opportunities</p>
</td></tr>
</table>
<div style="margin-top:32px;text-align:center;">
<a href="#" style="display:inline-block;padding:14px 32px;background:#10B981;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;border-radius:8px;">Get Started</a>
</div>
</td></tr>
${WRAPPER_END}`,
  },
  {
    name: "Sponsor Report",
    category: "report",
    description: "Data table layout with logo header for sponsor updates",
    thumbnail_color: "#3B82F6",
    thumbnail_image: "https://images.unsplash.com/photo-1521791136064-7986c2cb4cb3?w=600&h=200&fit=crop",
    html: `${WRAPPER_START}
<tr><td style="background:url('https://images.unsplash.com/photo-1521791136064-7986c2920216?w=600&h=200&fit=crop&crop=center') center/cover no-repeat, #000741;padding:0;">
<div style="background:rgba(0,7,65,0.75);padding:32px 40px;text-align:center;">
<h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Sponsorship Report</h1>
<p style="margin:8px 0 0;color:#93c5fd;font-size:14px;">[Month/Year]</p>
</div>
</td></tr>
<tr><td style="padding:40px;">
<p style="margin:0 0 24px;color:#374151;font-size:16px;line-height:26px;">Hi {{first_name}}, here's your sponsorship performance summary:</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
<tr style="background:#f9fafb;">
<td style="padding:12px 16px;font-weight:600;color:#374151;font-size:14px;border-bottom:1px solid #e5e7eb;">Metric</td>
<td style="padding:12px 16px;font-weight:600;color:#374151;font-size:14px;border-bottom:1px solid #e5e7eb;text-align:right;">Value</td>
</tr>
<tr><td style="padding:12px 16px;color:#6b7280;font-size:14px;border-bottom:1px solid #e5e7eb;">Total Impressions</td><td style="padding:12px 16px;color:#111827;font-size:14px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;">[Value]</td></tr>
<tr><td style="padding:12px 16px;color:#6b7280;font-size:14px;border-bottom:1px solid #e5e7eb;">Clicks</td><td style="padding:12px 16px;color:#111827;font-size:14px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;">[Value]</td></tr>
<tr><td style="padding:12px 16px;color:#6b7280;font-size:14px;border-bottom:1px solid #e5e7eb;">Engagement Rate</td><td style="padding:12px 16px;color:#111827;font-size:14px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;">[Value]</td></tr>
<tr><td style="padding:12px 16px;color:#6b7280;font-size:14px;">Leads Generated</td><td style="padding:12px 16px;color:#111827;font-size:14px;text-align:right;font-weight:600;">[Value]</td></tr>
</table>
<div style="margin-top:32px;text-align:center;">
<a href="#" style="display:inline-block;padding:14px 32px;background:#3B82F6;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;border-radius:8px;">View Full Report</a>
</div>
</td></tr>
${WRAPPER_END}`,
  },
  {
    name: "Newsletter",
    category: "newsletter",
    description: "Multi-section newsletter with image placeholders",
    thumbnail_color: "#F59E0B",
    thumbnail_image: "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=600&h=200&fit=crop",
    html: `${WRAPPER_START}
<tr><td style="background:url('https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&h=200&fit=crop&crop=center') center/cover no-repeat, linear-gradient(135deg,#F59E0B,#D97706);padding:0;">
<div style="background:rgba(120,80,0,0.65);padding:40px;text-align:center;">
<h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;">MilCrunch Weekly</h1>
<p style="margin:8px 0 0;color:#fef3c7;font-size:14px;">[Date]</p>
</div>
</td></tr>
<tr><td style="padding:40px;">
<p style="margin:0 0 24px;color:#374151;font-size:16px;line-height:26px;">Hey {{first_name}}, here's what's happening this week:</p>
<h3 style="margin:0 0 12px;color:#111827;font-size:18px;">Featured Story</h3>
<div style="background:#fef3c7;border-radius:8px;padding:20px;margin-bottom:24px;">
<p style="margin:0;color:#92400e;font-size:15px;line-height:24px;">[Your featured story content goes here. Highlight the most important news or update for your audience.]</p>
</div>
<h3 style="margin:0 0 12px;color:#111827;font-size:18px;">Upcoming Events</h3>
<p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:24px;">[List upcoming events, meetups, or important dates your subscribers should know about.]</p>
<h3 style="margin:0 0 12px;color:#111827;font-size:18px;">Creator Spotlight</h3>
<p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:24px;">[Feature a creator from your community. Share their story, achievements, and why they stand out.]</p>
<div style="text-align:center;">
<a href="#" style="display:inline-block;padding:14px 32px;background:#F59E0B;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;border-radius:8px;">Read More</a>
</div>
</td></tr>
${WRAPPER_END}`,
  },
  {
    name: "Event Reminder",
    category: "reminder",
    description: "Countdown-style reminder with schedule highlights",
    thumbnail_color: "#EF4444",
    thumbnail_image: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=600&h=200&fit=crop",
    html: `${WRAPPER_START}
<tr><td style="background:url('https://images.unsplash.com/photo-1523875194681-bedd468c58bf?w=600&h=200&fit=crop&crop=center') center/cover no-repeat, linear-gradient(135deg,#EF4444,#B91C1C);padding:0;">
<div style="background:rgba(140,20,20,0.7);padding:40px;text-align:center;">
<p style="margin:0 0 8px;color:#fecaca;font-size:14px;text-transform:uppercase;letter-spacing:2px;">Happening Soon</p>
<h1 style="margin:0;color:#ffffff;font-size:32px;font-weight:700;">[Event Name]</h1>
<p style="margin:16px 0 0;color:#ffffff;font-size:18px;">[Date] &bull; [Time]</p>
</div>
</td></tr>
<tr><td style="padding:40px;">
<p style="margin:0 0 24px;color:#374151;font-size:16px;line-height:26px;">Hey {{first_name}}, just a friendly reminder — this event is right around the corner!</p>
<h3 style="margin:0 0 16px;color:#111827;font-size:18px;">Schedule Highlights</h3>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:12px 16px;background:#fef2f2;border-radius:8px;border-left:4px solid #EF4444;">
<p style="margin:0;color:#991b1b;font-size:14px;"><strong>[Time]</strong> — [Session/Activity]</p>
</td></tr>
<tr><td style="height:8px;"></td></tr>
<tr><td style="padding:12px 16px;background:#fef2f2;border-radius:8px;border-left:4px solid #EF4444;">
<p style="margin:0;color:#991b1b;font-size:14px;"><strong>[Time]</strong> — [Session/Activity]</p>
</td></tr>
<tr><td style="height:8px;"></td></tr>
<tr><td style="padding:12px 16px;background:#fef2f2;border-radius:8px;border-left:4px solid #EF4444;">
<p style="margin:0;color:#991b1b;font-size:14px;"><strong>[Time]</strong> — [Session/Activity]</p>
</td></tr>
</table>
<div style="margin-top:32px;text-align:center;">
<a href="#" style="display:inline-block;padding:14px 32px;background:#EF4444;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;border-radius:8px;">View Full Schedule</a>
</div>
</td></tr>
${WRAPPER_END}`,
  },
  {
    name: "Post-Event Thank You",
    category: "thankyou",
    description: "Thank you message with event highlights and CTA",
    thumbnail_color: "#2d5282",
    thumbnail_image: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&h=200&fit=crop",
    html: `${WRAPPER_START}
<tr><td style="background:url('https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=200&fit=crop&crop=center') center/cover no-repeat, linear-gradient(135deg,#2d5282,#1e3a5f);padding:0;">
<div style="background:rgba(30,58,95,0.7);padding:48px 40px;text-align:center;">
<h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;">Thank You!</h1>
<p style="margin:12px 0 0;color:#bfdbfe;font-size:16px;">We couldn't have done it without you, {{first_name}}</p>
</div>
</td></tr>
<tr><td style="padding:40px;">
<p style="margin:0 0 24px;color:#374151;font-size:16px;line-height:26px;">Thank you for being part of [Event Name]! Here are some highlights:</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>
<td width="33%" style="padding:8px;text-align:center;">
<div style="background:#eff6ff;border-radius:12px;padding:20px;">
<p style="margin:0;color:#1e3a5f;font-size:28px;font-weight:700;">[#]</p>
<p style="margin:4px 0 0;color:#1e3a5f;font-size:13px;">Attendees</p>
</div>
</td>
<td width="33%" style="padding:8px;text-align:center;">
<div style="background:#eff6ff;border-radius:12px;padding:20px;">
<p style="margin:0;color:#1e3a5f;font-size:28px;font-weight:700;">[#]</p>
<p style="margin:4px 0 0;color:#1e3a5f;font-size:13px;">Speakers</p>
</div>
</td>
<td width="33%" style="padding:8px;text-align:center;">
<div style="background:#eff6ff;border-radius:12px;padding:20px;">
<p style="margin:0;color:#1e3a5f;font-size:28px;font-weight:700;">[#]</p>
<p style="margin:4px 0 0;color:#1e3a5f;font-size:13px;">Sponsors</p>
</div>
</td>
</tr>
</table>
<p style="margin:24px 0;color:#6b7280;font-size:15px;line-height:24px;">[Share memorable moments, key takeaways, or post-event resources here.]</p>
<div style="text-align:center;">
<a href="#" style="display:inline-block;padding:14px 32px;background:#2d5282;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;border-radius:8px;">View Event Recap</a>
</div>
</td></tr>
${WRAPPER_END}`,
  },
];

export function getTemplateByCategory(category: string): BuiltInTemplate | undefined {
  return BUILT_IN_TEMPLATES.find(t => t.category === category);
}
