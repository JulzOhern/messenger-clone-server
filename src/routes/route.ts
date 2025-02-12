import { Router } from "express";
import {
  register,
  login,
  getUser,
  authMiddleware,
  searchMessenger,
  createConvo,
  convoMessages,
  sendChat,
  myConversation,
  newConvo,
  logout,
  newConvoMessages,
  seenMessage,
  changeProfile,
  editProfile,
  sendGif,
  quickReaction,
  archiveConvo,
  myArchive,
  deleteChat,
  leaveGroupChat,
  newQuickReaction,
  changeGcName,
  searchPeopleToAdd,
  addPeopleInGroupChat,
  changeGcProfile,
  makeAdmin,
  removeMember,
} from "../controllers";

export const router = Router();

// authController
router.post("/auth/register", register);

router.post("/auth/login", login);

router.post("/auth/logout", authMiddleware, logout);

router.get("/user", authMiddleware, getUser);

router.get("/search-messenger", authMiddleware, searchMessenger);

router.put("/change-profile", authMiddleware, changeProfile);

router.put("/edit-profile", authMiddleware, editProfile);

router.post("/search-people-to-add", authMiddleware, searchPeopleToAdd);

// convoController
router.post("/create-convo", authMiddleware, createConvo);

router.get("/convo-messages/:conversationId", authMiddleware, convoMessages);

router.get("/my-conversations", authMiddleware, myConversation);

router.post("/send-chat", authMiddleware, sendChat);

router.post("/send-gif", authMiddleware, sendGif);

router.post("/quick-reaction", authMiddleware, quickReaction);

router.post("/new-quick-reaction", authMiddleware, newQuickReaction);

router.get("/new-convo-messages", authMiddleware, newConvoMessages);

router.post("/new-convo", authMiddleware, newConvo);

router.put("/seen-message", authMiddleware, seenMessage);

router.put("/archive-convo", authMiddleware, archiveConvo);

router.get("/my-archive", authMiddleware, myArchive);

router.put("/delete-chat", authMiddleware, deleteChat);

router.put("/leave-group-chat", authMiddleware, leaveGroupChat);

router.put("/change-gc-name", authMiddleware, changeGcName);

router.put("/add-people-in-group-chat", authMiddleware, addPeopleInGroupChat);

router.put("/change-gc-profile", authMiddleware, changeGcProfile);

router.put("/make-admin", authMiddleware, makeAdmin);

router.put("/remove-member", authMiddleware, removeMember);
