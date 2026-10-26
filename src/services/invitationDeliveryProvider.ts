/**
 * Money Vault — Invitation Delivery Provider Abstraction
 * Handles multi-channel invitation dispatch (Email, SMS, WhatsApp, Deep Link).
 * Implements strict delivery reporting: NEVER falsely claims delivered if provider unconfigured.
 */

import { GroupInvitation, SplitGroup, DeliveryStatus } from '../types/splitExpenses';
import { validateEmail, validatePhone } from '../utils/invitationValidation';

export interface DeliveryResult {
  success: boolean;
  deliveryStatus: DeliveryStatus;
  provider?: string;
  message: string;
  shareableUrl: string;
  failureReason?: string;
}

export interface ProviderConfig {
  emailConfigured: boolean;
  emailProvider?: string | null;
  smsConfigured: boolean;
  smsProvider?: string | null;
  appUrl: string;
}

export class InvitationDeliveryProvider {
  /**
   * Generates the secure invite URL for a token
   */
  public static getInviteUrl(token: string): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://moneyvault.app';
    return `${origin}/group-invite/${encodeURIComponent(token)}`;
  }

  /**
   * Generates WhatsApp direct share URL (Requirement 10)
   */
  public static getWhatsAppShareUrl(groupName: string, inviteUrl: string, inviterName?: string): string {
    const sender = inviterName ? `${inviterName} has` : 'You have been';
    const message = `${sender} invited you to join the "${groupName}" group in Money Vault! Track shared expenses, see who owes whom, and settle balances seamlessly.\n\nJoin here: ${inviteUrl}`;
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
  }

  /**
   * Generates standard Money Vault email conforming strictly to Requirement 5
   * Subject: You're invited to join a Money Vault group
   * Body contains group benefits and Join button, strictly avoiding private balances or transaction figures.
   */
  public static generateEmailContent(
    inviterName: string,
    groupName: string,
    groupDescription: string | undefined,
    inviteUrl: string,
    recipientName?: string
  ): { subject: string; text: string; html: string } {
    const greeting = recipientName ? `Hi ${recipientName},` : 'Hello,';
    const subject = "You're invited to join a Money Vault group";

    const text = `${greeting}\n\n${inviterName} invited you to join:\n\n${groupName}\n\nin Money Vault.\n\nJoin the group to:\n• Add your own expenses\n• See shared expenses\n• Track who owes whom\n• Settle balances easily\n\n[ JOIN GROUP ]: ${inviteUrl}\n\nMoney Vault\nSecure Your Money. Master Your Future.`;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B0D0C; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #FFFFFF;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0B0D0C; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #151917; border: 1px solid #232B27; border-radius: 24px; padding: 36px 32px; text-align: left;">
          <!-- Logo & Header -->
          <tr>
            <td align="center" style="padding-bottom: 24px; border-bottom: 1px solid #232B27;">
              <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="background-color: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; width: 44px; height: 44px; text-align: center; vertical-align: middle;">
                    <span style="font-size: 22px; line-height: 44px;">⚡</span>
                  </td>
                  <td style="padding-left: 12px;">
                    <div style="font-size: 18px; font-weight: 900; letter-spacing: 1px; color: #10B981;">MONEY VAULT</div>
                    <div style="font-size: 10px; color: #7F8C8D; letter-spacing: 0.5px; text-transform: uppercase;">COLLABORATIVE WORKSPACE</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Headline -->
          <tr>
            <td style="padding-top: 28px; padding-bottom: 12px;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #FFFFFF; line-height: 1.3;">
                ${greeting}
              </h1>
              <p style="margin: 8px 0 0 0; font-size: 15px; color: #A0AEC0; line-height: 1.5;">
                <strong style="color: #FFFFFF;">${inviterName}</strong> invited you to join:
              </p>
            </td>
          </tr>

          <!-- Group Card -->
          <tr>
            <td style="padding: 16px 0;">
              <div style="background-color: #1C2320; border: 1px solid #2C3833; border-radius: 16px; padding: 20px 24px;">
                <div style="font-size: 20px; font-weight: 900; color: #10B981; margin-bottom: 4px;">
                  ${groupName}
                </div>
                ${groupDescription ? `<div style="font-size: 13px; color: #8C9B94; line-height: 1.4;">${groupDescription}</div>` : ''}
              </div>
            </td>
          </tr>

          <!-- Features / Expectations -->
          <tr>
            <td style="padding: 12px 0 24px 0;">
              <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #D1D5DB;">
                Join the group to:
              </p>
              <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #9CA3AF; line-height: 1.8;">
                <li><strong style="color: #E5E7EB;">Add your own expenses</strong></li>
                <li><strong style="color: #E5E7EB;">See shared expenses</strong></li>
                <li><strong style="color: #E5E7EB;">Track who owes whom</strong></li>
                <li><strong style="color: #E5E7EB;">Settle balances easily</strong></li>
              </ul>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding: 12px 0 28px 0;">
              <a href="${inviteUrl}" target="_blank" style="display: inline-block; background-color: #10B981; color: #04130C; font-size: 15px; font-weight: 900; text-decoration: none; padding: 14px 40px; border-radius: 14px; letter-spacing: 0.5px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);">
                JOIN GROUP
              </a>
            </td>
          </tr>

          <!-- Link fallback -->
          <tr>
            <td style="padding-bottom: 24px; border-bottom: 1px solid #232B27;">
              <p style="margin: 0; font-size: 12px; color: #6B7280; line-height: 1.5; word-break: break-all;">
                Or copy and paste this link in your browser:<br/>
                <a href="${inviteUrl}" style="color: #10B981; text-decoration: none;">${inviteUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 24px;">
              <div style="font-size: 13px; font-weight: 800; color: #9CA3AF; letter-spacing: 0.5px;">MONEY VAULT</div>
              <div style="font-size: 11px; color: #6B7280; margin-top: 4px;">Secure Your Money. Master Your Future.</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    return { subject, text, html };
  }

  /**
   * Check delivery provider status
   */
  public static async getProviderConfig(): Promise<ProviderConfig> {
    try {
      const res = await fetch('/api/invitations/config');
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // fallback
    }
    return {
      emailConfigured: false,
      smsConfigured: false,
      appUrl: typeof window !== 'undefined' ? window.location.origin : 'https://moneyvault.app',
    };
  }

  /**
   * Primary Invitation Dispatch Pipeline (Requirement 13)
   * Calls POST /api/groups/:groupId/invitations
   */
  public static async createGroupInvitation(
    groupId: string,
    params: {
      email?: string;
      phone?: string;
      name?: string;
      role?: 'member' | 'admin';
      inviterName?: string;
      groupData?: SplitGroup;
    },
    authToken?: string
  ): Promise<{
    success: boolean;
    invitation: GroupInvitation;
    deliveryResult: DeliveryResult;
  }> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken && typeof authToken === 'string' && authToken.trim().length > 0) {
      headers['Authorization'] = `Bearer ${authToken.trim()}`;
    }

    const response = await fetch(`/api/groups/${encodeURIComponent(groupId)}/invitations`, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data.message || data.error || 'Failed to create invitation';
      const fallbackUrl = data.inviteUrl || (data.invitation ? this.getInviteUrl(data.invitation.token) : '');
      const err = new Error(errMsg);
      (err as any).data = data;
      (err as any).isDuplicate = response.status === 409;
      (err as any).shareableUrl = fallbackUrl;
      throw err;
    }

    const invitation = data.invitation as GroupInvitation;
    const inviteUrl = data.inviteUrl || this.getInviteUrl(invitation.token);

    const deliveryResult: DeliveryResult = {
      success: data.delivered === true,
      deliveryStatus: data.deliveryStatus || (data.delivered ? 'sent' : 'failed'),
      provider: data.deliveryProvider,
      failureReason: data.failureReason,
      message: data.message,
      shareableUrl: inviteUrl,
    };

    return {
      success: true,
      invitation,
      deliveryResult,
    };
  }

  /**
   * Resend Invitation (Requirement 16)
   */
  public static async resendGroupInvitation(
    groupId: string,
    invitationId: string,
    authToken?: string
  ): Promise<DeliveryResult> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken && typeof authToken === 'string' && authToken.trim().length > 0) {
      headers['Authorization'] = `Bearer ${authToken.trim()}`;
    }

    const response = await fetch(
      `/api/groups/${encodeURIComponent(groupId)}/invitations/${encodeURIComponent(invitationId)}/resend`,
      {
        method: 'POST',
        headers,
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || data.error || 'Failed to resend invitation');
    }

    return {
      success: data.delivered === true,
      deliveryStatus: data.deliveryStatus,
      provider: data.deliveryProvider,
      failureReason: data.failureReason,
      message: data.message,
      shareableUrl: data.inviteUrl,
    };
  }

  /**
   * Revoke Invitation (Requirement 8, 17)
   */
  public static async revokeGroupInvitation(
    groupId: string,
    invitationId: string,
    authToken?: string
  ): Promise<{ success: boolean; message: string }> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken && typeof authToken === 'string' && authToken.trim().length > 0) {
      headers['Authorization'] = `Bearer ${authToken.trim()}`;
    }

    const response = await fetch(
      `/api/groups/${encodeURIComponent(groupId)}/invitations/${encodeURIComponent(invitationId)}/revoke`,
      {
        method: 'POST',
        headers,
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || data.error || 'Failed to revoke invitation');
    }

    return data;
  }

  /**
   * Fetch Public Invitation Details for acceptance page
   */
  public static async getInvitationByToken(token: string): Promise<{
    invitation: GroupInvitation;
    groupPreview: any;
  }> {
    const response = await fetch(`/api/group-invite/${encodeURIComponent(token)}`);
    const data = await response.json();

    if (!response.ok) {
      const err = new Error(data.message || 'Invitation not found');
      (err as any).status = response.status;
      (err as any).data = data;
      throw err;
    }

    return {
      invitation: data.invitation,
      groupPreview: data.groupPreview,
    };
  }

  /**
   * Accept Invitation (Requirement 21, 22)
   */
  public static async acceptInvitation(
    token: string,
    params: {
      userUid: string;
      userName: string;
      userEmail?: string;
      confirmMismatchedIdentity?: boolean;
    },
    authToken?: string
  ): Promise<{ success: boolean; group: SplitGroup }> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken && typeof authToken === 'string' && authToken.trim().length > 0) {
      headers['Authorization'] = `Bearer ${authToken.trim()}`;
    }

    const response = await fetch(`/api/group-invite/${encodeURIComponent(token)}/accept`, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });

    const data = await response.json();
    if (!response.ok) {
      const err = new Error(data.message || 'Failed to accept invitation');
      (err as any).status = response.status;
      (err as any).data = data;
      (err as any).requiresExplicitConfirmation = data.requiresExplicitConfirmation === true;
      throw err;
    }

    return data;
  }

  /**
   * Legacy Helper: Send Email Invitation
   */
  public static async sendEmailInvitation(
    invitation: GroupInvitation,
    recipientEmail: string,
    recipientName?: string,
    authToken?: string
  ): Promise<DeliveryResult> {
    if (!authToken || typeof authToken !== 'string' || authToken.trim().length === 0) {
      throw new Error('Authentication token is required to send email invitations');
    }

    const inviteUrl = this.getInviteUrl(invitation.token);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken.trim()}`,
    };

    try {
      const response = await fetch('/api/invitations/send-email', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          groupId: invitation.groupId,
          invitationId: invitation.id,
        }),
      });

      const data = await response.json();
      if (response.ok && data.delivered) {
        return {
          success: true,
          deliveryStatus: 'sent',
          provider: data.provider || 'Email Provider',
          message: data.message || `Invitation sent to ${recipientEmail}`,
          shareableUrl: inviteUrl,
        };
      } else {
        return {
          success: false,
          deliveryStatus: 'failed',
          failureReason: data.error || 'Email service not configured',
          message:
            data.message ||
            'Email delivery is not configured. Please use Copy Invitation Link or Share on WhatsApp to deliver the invite.',
          shareableUrl: inviteUrl,
        };
      }
    } catch (err: any) {
      return {
        success: false,
        deliveryStatus: 'failed',
        failureReason: err?.message || 'Network error communicating with server',
        message: err?.message || 'Could not contact email service. Please share the invitation link directly.',
        shareableUrl: inviteUrl,
      };
    }
  }

  /**
   * Legacy Helper: Send SMS Invitation
   */
  public static async sendSmsInvitation(
    invitation: GroupInvitation,
    phoneNumber: string,
    authToken?: string
  ): Promise<DeliveryResult> {
    if (!authToken || typeof authToken !== 'string' || authToken.trim().length === 0) {
      throw new Error('Authentication token is required to send SMS invitations');
    }

    const inviteUrl = this.getInviteUrl(invitation.token);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken.trim()}`,
    };

    try {
      const response = await fetch('/api/invitations/send-sms', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          groupId: invitation.groupId,
          invitationId: invitation.id,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok && data.delivered) {
        return {
          success: true,
          deliveryStatus: 'sent',
          provider: data.provider || 'Twilio SMS',
          message: `SMS invitation dispatched to ${phoneNumber}`,
          shareableUrl: inviteUrl,
        };
      } else {
        return {
          success: false,
          deliveryStatus: 'not_configured',
          failureReason: data.message || 'SMS service is not configured',
          message:
            data.message ||
            'SMS invitations require messaging service configuration. Please share the direct invitation link via WhatsApp or copy link.',
          shareableUrl: inviteUrl,
        };
      }
    } catch {
      return {
        success: false,
        deliveryStatus: 'not_configured',
        failureReason: 'SMS provider not configured',
        message:
          'SMS invitations require messaging service configuration. Please share the direct invitation link via WhatsApp or copy link.',
        shareableUrl: inviteUrl,
      };
    }
  }
}
