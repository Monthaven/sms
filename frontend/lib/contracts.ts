/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

/**
 * Contract management utilities for DocuSign embedded signing.
 * Used for caller contract signing flow.
 */

export interface ContractRequest {
  userId: string;
  userEmail: string;
  userName: string;
  contractType: "CALLER_AGREEMENT" | "NDA" | "IC_AGREEMENT";
  returnUrl: string;
}

export interface ContractResult {
  envelopeId: string;
  signingUrl: string;
  expiresAt: Date;
}

// DocuSign template IDs (configure in env)
const TEMPLATE_IDS: Record<string, string> = {
  CALLER_AGREEMENT: process.env.DOCUSIGN_CALLER_TEMPLATE_ID ?? "",
  NDA: process.env.DOCUSIGN_NDA_TEMPLATE_ID ?? "",
  IC_AGREEMENT: process.env.DOCUSIGN_IC_TEMPLATE_ID ?? "",
};

/**
 * Create embedded signing session for a contract.
 * Returns the URL the user should be redirected to.
 */
export async function createContractSigningSession(
  request: ContractRequest
): Promise<ContractResult> {
  const templateId = TEMPLATE_IDS[request.contractType];
  
  if (!templateId) {
    throw new Error(`No template configured for contract type: ${request.contractType}`);
  }

  const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
  const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY;
  const apiBasePath = process.env.DOCUSIGN_API_BASE ?? "https://demo.docusign.net/restapi";
  const accessToken = process.env.DOCUSIGN_ACCESS_TOKEN; // In production, use OAuth

  if (!accountId || !integrationKey || !accessToken) {
    throw new Error("DocuSign environment variables not configured");
  }

  // 1. Create envelope from template
  const envelopeResponse = await fetch(
    `${apiBasePath}/v2.1/accounts/${accountId}/envelopes`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        templateId,
        templateRoles: [
          {
            email: request.userEmail,
            name: request.userName,
            roleName: "Signer",
            clientUserId: request.userId, // Required for embedded signing
          },
        ],
        status: "sent",
      }),
    }
  );

  if (!envelopeResponse.ok) {
    const error = await envelopeResponse.text();
    throw new Error(`Failed to create envelope: ${error}`);
  }

  const envelope = await envelopeResponse.json();
  const envelopeId = envelope.envelopeId;

  // 2. Create embedded signing URL
  const recipientViewResponse = await fetch(
    `${apiBasePath}/v2.1/accounts/${accountId}/envelopes/${envelopeId}/views/recipient`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        returnUrl: request.returnUrl,
        authenticationMethod: "email",
        email: request.userEmail,
        userName: request.userName,
        clientUserId: request.userId,
      }),
    }
  );

  if (!recipientViewResponse.ok) {
    const error = await recipientViewResponse.text();
    throw new Error(`Failed to create signing URL: ${error}`);
  }

  const recipientView = await recipientViewResponse.json();

  return {
    envelopeId,
    signingUrl: recipientView.url,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
  };
}

/**
 * Check the status of an envelope.
 */
export async function getEnvelopeStatus(
  envelopeId: string
): Promise<{ status: string; signedAt?: Date }> {
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
  const apiBasePath = process.env.DOCUSIGN_API_BASE ?? "https://demo.docusign.net/restapi";
  const accessToken = process.env.DOCUSIGN_ACCESS_TOKEN;

  if (!accountId || !accessToken) {
    throw new Error("DocuSign environment variables not configured");
  }

  const response = await fetch(
    `${apiBasePath}/v2.1/accounts/${accountId}/envelopes/${envelopeId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to get envelope status");
  }

  const data = await response.json();

  return {
    status: data.status,
    signedAt: data.completedDateTime ? new Date(data.completedDateTime) : undefined,
  };
}

/**
 * Mock implementation for development/testing.
 * Returns a fake signing URL that redirects back immediately.
 */
export async function createMockSigningSession(
  request: ContractRequest
): Promise<ContractResult> {
  const mockEnvelopeId = `mock-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  
  // In development, redirect to return URL with success params
  const signingUrl = `${request.returnUrl}?event=signing_complete&envelope_id=${mockEnvelopeId}`;
  
  return {
    envelopeId: mockEnvelopeId,
    signingUrl,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  };
}

/**
 * Main entry point - uses mock in development, real DocuSign in production.
 */
export async function initiateContractSigning(
  request: ContractRequest
): Promise<ContractResult> {
  if (process.env.NODE_ENV === "development" && !process.env.DOCUSIGN_ACCOUNT_ID) {
    return createMockSigningSession(request);
  }
  return createContractSigningSession(request);
}
