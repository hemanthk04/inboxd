export interface InboxdOptions {
  apiKey: string;
  baseUrl?: string;
}

export interface WaitForEmailOptions {
  subject?: string;
  from?: string;
  text?: string;

  timeout?: number;
  interval?: number;
  after?: Date;
}

export interface EmailAddress {
  name?: string | null;
  address: string;
}


export interface EmailAttachment {
  filename: string | null;
  mimeType: string;
  disposition: string | null;
  related: boolean;
  contentId: string | null;
  content: string; // Base64-encoded content

  toBuffer(): Buffer;
}

export function attachmentToBuffer(
  attachment: EmailAttachment,
): Buffer {
  return Buffer.from(attachment.content, "base64");
}


export interface InboxdEmail {
  id: string;
  messageId: string | null;
  from: EmailAddress | EmailAddress[] | null;
  to: EmailAddress | EmailAddress[] | null;
  subject: string | null;
  text: string | null;
  html: string | null;
  date: string | null;
  attachments: EmailAttachment[];
  receivedAt: string;
}

interface MessagesResponse {
  messages: InboxdEmail[];
  count: number;
  limit: number;
}

export class InboxdError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InboxdError";
  }
}

export class EmailTimeoutError extends InboxdError {
  constructor(timeout: number) {
    super(`No matching email received within ${timeout}ms`);
    this.name = "EmailTimeoutError";
  }
}

export class Inboxd {
  private apiKey: string;
  private baseUrl: string;

  constructor(options: InboxdOptions) {
    if (!options.apiKey) {
      throw new InboxdError("API key is required");
    }

    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? "http://localhost:3000").replace(
      /\/$/,
      "",
    );
  }

  inbox(inboxId: string) {
    if (!inboxId) {
      throw new InboxdError("Inbox ID is required");
    }

    return new Inbox(this.apiKey, this.baseUrl, inboxId);
  }
}

class Inbox {
  constructor(
    private apiKey: string,
    private baseUrl: string,
    private inboxId: string,
  ) {}

  async waitForEmail(options: WaitForEmailOptions = {}): Promise<InboxdEmail> {
    const timeout = options.timeout ?? 30_000;
    const interval = options.interval ?? 1_000;

    if (timeout <= 0 || interval <= 0) {
      throw new InboxdError("Timeout and interval must be greater than zero");
    }

    // Capture the starting point so older emails aren't returned.
    const after = options.after ?? new Date();

    const deadline = Date.now() + timeout;

    while (Date.now() < deadline) {
      const params = new URLSearchParams({
        after: after.toISOString(),
        limit: "100",
      });

      if (options.subject) {
        params.set("subject", options.subject);
      }

      const response = await fetch(
        `${this.baseUrl}/v1/inboxes/${encodeURIComponent(
          this.inboxId,
        )}/messages?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      if (!response.ok) {
        const body = await response.json().catch(() => null);

        throw new InboxdError(
          body?.error ?? `Inboxd API error: ${response.status}`,
        );
      }

      const data = (await response.json()) as MessagesResponse;

      const matchingEmail = data.messages.find((email) => {
        // Match sender (case-insensitive).
        // PostalMime may return the sender as an object:
        // { name: "Sender", address: "sender@example.com" }
        if (options.from) {
          const senders = Array.isArray(email.from)
            ? email.from
            : email.from
              ? [email.from]
              : [];

          const senderMatches = senders.some((sender) =>
            sender.address.toLowerCase().includes(options.from!.toLowerCase()),
          );

          if (!senderMatches) {
            return false;
          }
        }

        // Match body text (case-insensitive).
        if (
          options.text &&
          !(email.text ?? "").toLowerCase().includes(options.text.toLowerCase())
        ) {
          return false;
        }

        return true;
      });

      if (matchingEmail) {
        return matchingEmail;
      }

      const remaining = deadline - Date.now();

      if (remaining > 0) {
        await new Promise((resolve) =>
          setTimeout(resolve, Math.min(interval, remaining)),
        );
      }
    }

    throw new EmailTimeoutError(timeout);
  }
}
