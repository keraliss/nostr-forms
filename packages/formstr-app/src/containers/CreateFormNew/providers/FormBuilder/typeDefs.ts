import { AnswerSettings } from "@formstr/sdk/dist/interfaces";
import { IFormSettings } from "../../components/FormSettings/types";
import { Tag } from "@formstr/sdk/dist/formstr/nip101";
import { Field } from "../../../../nostr/types";

export type RelayStatus = 'connected' | 'pending' | 'error' | 'unknown';
export interface RelayItem {
  url: string;
  tempId: string;
}

export interface ILocalForm {
  key: string;
  name: string;
  createdAt: string;
  publicKey: string;
  viewKey?: string;
  privateKey: string;
  formCredentials?: Array<string>;
  formId: string;
  relay: string;
}

export interface FormInitData {
  spec: Tag[];
  id: string;
  secret?: string;
  viewKey?: string | null;
}

export interface SectionData {
  id: string;
  title: string;
  description?: string;
  questionIds: string[];
  order?: number;
}

export interface IFormBuilderContext {
  initializeForm: (form: FormInitData) => void;
  questionsList: Field[];
  saveForm: (onRelayAccepted?: (url: string) => void) => Promise<void>;
  closeSettingsOnOutsideClick: () => void;
  closeMenuOnOutsideClick: () => void;
  editQuestion: (question: Field, tempId: string) => void;
  addQuestion: (
    primitive?: string,
    label?: string,
    answerSettings?: AnswerSettings
  ) => void;
  deleteQuestion: (tempId: string) => void;
  questionIdInFocus?: string;
  setQuestionIdInFocus: (tempId?: string) => void;
  formSettings: IFormSettings;
  updateFormSetting: (settings: IFormSettings) => void;
  updateFormTitleImage: (e: React.FormEvent<HTMLInputElement>) => void;
  isRightSettingsOpen: boolean;
  isLeftMenuOpen: boolean;
  setIsLeftMenuOpen: (isOpen: boolean) => void;
  toggleSettingsWindow: () => void;
  formName: string;
  updateFormName: (formName: string) => void;
  updateQuestionsList: (list: Field[]) => void;
  getFormSpec: () => Tag[];
  saveDraft: () => void;
  selectedTab: string;
  setSelectedTab: (tab: string) => void;
  bottomElementRef: React.RefObject<HTMLDivElement> | null;
  relayList: RelayItem[];
  editList: Set<string> | null;
  setEditList: (keys: Set<string>) => void;
  viewList: Set<string> | null;
  setViewList: (keys: Set<string>) => void;
  isRelayManagerModalOpen: boolean;
  toggleRelayManagerModal: () => void;
  addRelayToList: (url: string) => void;
  editRelayInList: (tempId: string, newUrl: string) => void;
  deleteRelayFromList: (tempId: string) => void;
  sections: SectionData[];
  addSection: (title?: string, description?: string) => SectionData;
  updateSection: (id: string, updates: Partial<SectionData>) => void;
  removeSection: (id: string) => void;
  moveQuestionToSection: (questionId: string, sectionId?: string) => void;
  getSectionForQuestion: (questionId: string) => string | null;
  reorderSections: (newOrder: SectionData[]) => void;
}