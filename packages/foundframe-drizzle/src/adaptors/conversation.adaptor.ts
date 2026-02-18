/**
 * Drizzle implementation of ConversationPort
 */

import { eq, and } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { ConversationAdaptor } from '@o19/foundframe-front/ports';
import type { ConversationPort } from '@o19/foundframe-front/ports';
import type { Conversation, CreateConversation, UpdateConversation } from '@o19/foundframe-front/domain';
import type { ConversationRole } from '@o19/foundframe-front';
import { conversation, conversationParticipant, conversationMedia } from '../schema.js';

export class DrizzleConversationAdaptor extends ConversationAdaptor implements ConversationPort {
  constructor(private db: BaseSQLiteDatabase<any, any>) {
    super();
  }

  async create(data: CreateConversation): Promise<Conversation> {
    const result = await this.db
      .insert(conversation)
      .values({
        title: data.title,
        content: data.content,
        captureTime: data.captureTime,
        firstEntryTime: data.firstEntryTime,
        lastEntryTime: data.lastEntryTime,
        sourceUrl: data.sourceUrl,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    const id = result[0].id;

    if (data.participants) {
      for (const p of data.participants) {
        await this.addParticipant(id, p.personId, p.role);
      }
    }

    if (data.media) {
      for (const m of data.media) {
        await this.addMedia(id, m.mediaId, m.context);
      }
    }

    return this.getById(id) as Promise<Conversation>;
  }

  async getById(id: number): Promise<Conversation | null> {
    const result = await this.db
      .select()
      .from(conversation)
      .where(eq(conversation.id, id))
      .limit(1);
    if (result.length === 0) return null;

    const conv = result[0];
    const participants = await this.getParticipants(id);
    const media = await this.getMedia(id);

    return this.toDomain(conv, participants, media);
  }

  async update(id: number, data: UpdateConversation): Promise<void> {
    const updateData: Partial<typeof conversation.$inferInsert> = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.content) updateData.content = data.content;
    if (data.captureTime) updateData.captureTime = data.captureTime;
    if (data.firstEntryTime !== undefined) updateData.firstEntryTime = data.firstEntryTime;
    if (data.lastEntryTime !== undefined) updateData.lastEntryTime = data.lastEntryTime;
    if (data.sourceUrl !== undefined) updateData.sourceUrl = data.sourceUrl;
    updateData.updatedAt = new Date();

    await this.db.update(conversation).set(updateData).where(eq(conversation.id, id));
  }

  async delete(id: number): Promise<void> {
    await this.db.delete(conversation).where(eq(conversation.id, id));
  }

  async addParticipant(
    conversationId: number,
    personId: number,
    role?: ConversationRole
  ): Promise<void> {
    await this.db
      .insert(conversationParticipant)
      .values({
        conversationId,
        personId,
        role
      })
      .onConflictDoNothing();
  }

  async removeParticipant(conversationId: number, personId: number): Promise<void> {
    await this.db
      .delete(conversationParticipant)
      .where(
        and(
          eq(conversationParticipant.conversationId, conversationId),
          eq(conversationParticipant.personId, personId)
        )
      );
  }

  async addMedia(
    conversationId: number,
    mediaId: number,
    context?: Record<string, unknown>
  ): Promise<void> {
    await this.db
      .insert(conversationMedia)
      .values({
        conversationId,
        mediaId,
        context
      })
      .onConflictDoNothing();
  }

  async removeMedia(conversationId: number, mediaId: number): Promise<void> {
    await this.db
      .delete(conversationMedia)
      .where(
        and(
          eq(conversationMedia.conversationId, conversationId),
          eq(conversationMedia.mediaId, mediaId)
        )
      );
  }

  private async getParticipants(
    conversationId: number
  ): Promise<Array<{ personId: number; role?: ConversationRole }>> {
    const results = await this.db
      .select()
      .from(conversationParticipant)
      .where(eq(conversationParticipant.conversationId, conversationId));

    return results.map((r) => ({
      personId: r.personId,
      role: r.role as ConversationRole | undefined
    }));
  }

  private async getMedia(
    conversationId: number
  ): Promise<Array<{ mediaId: number; context?: Record<string, unknown> }>> {
    const results = await this.db
      .select()
      .from(conversationMedia)
      .where(eq(conversationMedia.conversationId, conversationId));

    return results.map((r) => ({
      mediaId: r.mediaId,
      context: (r.context as Record<string, unknown>) ?? undefined
    }));
  }

  private toDomain(
    row: typeof conversation.$inferSelect,
    participants: Array<{ personId: number; role?: ConversationRole }>,
    media: Array<{ mediaId: number; context?: Record<string, unknown> }>
  ): Conversation {
    return {
      id: row.id,
      title: row.title ?? undefined,
      content: row.content as unknown[],
      captureTime: row.captureTime,
      firstEntryTime: row.firstEntryTime ?? undefined,
      lastEntryTime: row.lastEntryTime ?? undefined,
      sourceUrl: row.sourceUrl ?? undefined,
      participants: participants.length > 0 ? participants : undefined,
      media: media.length > 0 ? media : undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt ?? undefined
    };
  }
}
