export type Character = {
  _id: string;
  name: string;
  personality?: string;
  description?: string;
  emotion?: string;
  gender?: "female" | "male";
  visibility?: "public" | "private";
};

export type Message = {
  _id?: string;
  sender: "user" | "character";
  text: string;
  type?: "chat" | "intro";
};

export type Relationship = {
  affection: number;
  trust: number;
  intimacy: number;
  anger: number;
};
