import { create } from "zustand";

interface RoleModalState {
  roleModalState: boolean;
  opportunityId: string | null;
  openRoleModal: () => void;
  closeRoleModal: () => void;
  setVolunteerOpportunityId: (id: string | null) => void;
  clearRoleModal: () => void;
}

/**
 * Tracks whether the "roles don't add up" prompt should be shown after the
 * volunteer-role editor is left in an inconsistent state.
 */
export const useRoleModalStore = create<RoleModalState>((set) => ({
  roleModalState: false,
  opportunityId: null,

  openRoleModal: () => set({ roleModalState: true }),
  closeRoleModal: () => set({ roleModalState: false }),
  setVolunteerOpportunityId: (opportunityId) => set({ opportunityId }),
  clearRoleModal: () => set({ roleModalState: false, opportunityId: null }),
}));
