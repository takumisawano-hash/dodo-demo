// ========================================
// DoDo App - Database CRUD Operations
// ========================================

import { supabase } from './supabase';

// ----------------------------------------
// Database Types
// ----------------------------------------

export interface UserProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserProfileInsert {
  id: string;
  username: string;
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
}

export interface UserProfileUpdate {
  username?: string;
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
}

export interface Conversation {
  id: string;
  user_id: string;
  slot_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationInsert {
  user_id: string;
  slot_id: string;
  title?: string | null;
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export interface ConversationMessageInsert {
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface SlotConfig {
  id: string;
  user_id: string;
  slot_number: number;
  name: string;
  character_id: string | null;
  system_prompt: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SlotConfigInsert {
  user_id: string;
  slot_number: number;
  name: string;
  character_id?: string | null;
  system_prompt?: string | null;
  is_active?: boolean;
}

export interface SlotConfigUpdate {
  name?: string;
  character_id?: string | null;
  system_prompt?: string | null;
  is_active?: boolean;
}

export interface DbResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ----------------------------------------
// User Profile CRUD
// ----------------------------------------

export async function getUserProfile(userId: string): Promise<DbResult<UserProfile>> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}

export async function createUserProfile(profile: UserProfileInsert): Promise<DbResult<UserProfile>> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .insert(profile)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}

export async function updateUserProfile(
  userId: string,
  updates: UserProfileUpdate
): Promise<DbResult<UserProfile>> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}

export async function deleteUserProfile(userId: string): Promise<DbResult<void>> {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}

// ----------------------------------------
// Conversation CRUD
// ----------------------------------------

export async function getConversations(
  userId: string,
  slotId?: string
): Promise<DbResult<Conversation[]>> {
  try {
    let query = supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (slotId) {
      query = query.eq('slot_id', slotId);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}

export async function getConversation(conversationId: string): Promise<DbResult<Conversation>> {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}

export async function createConversation(
  conversation: ConversationInsert
): Promise<DbResult<Conversation>> {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .insert(conversation)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}

export async function updateConversationTitle(
  conversationId: string,
  title: string
): Promise<DbResult<Conversation>> {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .update({ title, updated_at: new Date().toISOString() })
      .eq('id', conversationId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}

export async function deleteConversation(conversationId: string): Promise<DbResult<void>> {
  try {
    // Messages will be deleted by CASCADE
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}

// ----------------------------------------
// Conversation Messages CRUD
// ----------------------------------------

export async function getMessages(
  conversationId: string,
  limit: number = 50,
  offset: number = 0
): Promise<DbResult<ConversationMessage[]>> {
  try {
    const { data, error } = await supabase
      .from('conversation_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}

export async function addMessage(
  message: ConversationMessageInsert
): Promise<DbResult<ConversationMessage>> {
  try {
    const { data, error } = await supabase
      .from('conversation_messages')
      .insert(message)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Update conversation's updated_at
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', message.conversation_id);

    return { success: true, data };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}

export async function addMessages(
  messages: ConversationMessageInsert[]
): Promise<DbResult<ConversationMessage[]>> {
  try {
    const { data, error } = await supabase
      .from('conversation_messages')
      .insert(messages)
      .select();

    if (error) {
      return { success: false, error: error.message };
    }

    // Update conversation's updated_at
    if (messages.length > 0) {
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', messages[0].conversation_id);
    }

    return { success: true, data: data || [] };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}

export async function deleteMessages(conversationId: string): Promise<DbResult<void>> {
  try {
    const { error } = await supabase
      .from('conversation_messages')
      .delete()
      .eq('conversation_id', conversationId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}

// ----------------------------------------
// Slot Config CRUD
// ----------------------------------------

export async function getSlotConfigs(userId: string): Promise<DbResult<SlotConfig[]>> {
  try {
    const { data, error } = await supabase
      .from('slot_configs')
      .select('*')
      .eq('user_id', userId)
      .order('slot_number', { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}

export async function getSlotConfig(
  userId: string,
  slotNumber: number
): Promise<DbResult<SlotConfig>> {
  try {
    const { data, error } = await supabase
      .from('slot_configs')
      .select('*')
      .eq('user_id', userId)
      .eq('slot_number', slotNumber)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}

export async function getSlotConfigById(slotId: string): Promise<DbResult<SlotConfig>> {
  try {
    const { data, error } = await supabase
      .from('slot_configs')
      .select('*')
      .eq('id', slotId)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}

export async function createSlotConfig(config: SlotConfigInsert): Promise<DbResult<SlotConfig>> {
  try {
    const { data, error } = await supabase
      .from('slot_configs')
      .insert(config)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}

export async function updateSlotConfig(
  slotId: string,
  updates: SlotConfigUpdate
): Promise<DbResult<SlotConfig>> {
  try {
    const { data, error } = await supabase
      .from('slot_configs')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', slotId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}

export async function deleteSlotConfig(slotId: string): Promise<DbResult<void>> {
  try {
    const { error } = await supabase
      .from('slot_configs')
      .delete()
      .eq('id', slotId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}

export async function setActiveSlot(
  userId: string,
  slotId: string
): Promise<DbResult<SlotConfig>> {
  try {
    // Deactivate all slots for user
    await supabase
      .from('slot_configs')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    // Activate the selected slot
    const { data, error } = await supabase
      .from('slot_configs')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('id', slotId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}

export async function getActiveSlot(userId: string): Promise<DbResult<SlotConfig | null>> {
  try {
    const { data, error } = await supabase
      .from('slot_configs')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}

// ----------------------------------------
// Utility Functions
// ----------------------------------------

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}

// ----------------------------------------
// Initialize Default Slots
// ----------------------------------------

export async function initializeDefaultSlots(userId: string): Promise<DbResult<SlotConfig[]>> {
  const defaultSlots: SlotConfigInsert[] = [
    { user_id: userId, slot_number: 1, name: 'Default', is_active: true },
    { user_id: userId, slot_number: 2, name: 'Slot 2', is_active: false },
    { user_id: userId, slot_number: 3, name: 'Slot 3', is_active: false },
  ];

  try {
    const { data, error } = await supabase
      .from('slot_configs')
      .insert(defaultSlots)
      .select();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}
