import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export const createConvo = async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const user = req.user;
    const { receiverId } = body;
    const isSelfChat = user?.id === receiverId;

    const convoExist = await prisma.conversation.findFirst({
      where: {
        userIds: isSelfChat ? { equals: [receiverId] } : { hasEvery: [user?.id, receiverId] },
        isGroupChat: false,
      },
    });

    if (convoExist) {
      res.status(200).json(convoExist);
      return;
    }

    const createConvo = await prisma.conversation.create({
      data: {
        userIds: {
          set: user?.id === receiverId ? [receiverId] : [user?.id, receiverId],
        },
      },
    });

    res.status(200).json(createConvo);
  } catch (error: any) {
    console.log(error.message);
  }
};

export const myConversation = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const myConversations = await prisma.conversation.findMany({
      where: {
        userIds: { has: userId },
        messages: { some: {} },
      },
      orderBy: { updatedAt: "desc" },
      include: {
        users: true,
        messages: {
          include: {
            user: true,
            seenBy: true,
            notif: {
              include: {
                user: true,
                users: true,
              },
            },
          },
        },
      },
    });

    res.status(200).json(myConversations);
  } catch (error: any) {
    console.log(error.message);
  }
};

export const convoMessages = async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;

    const conversation = await prisma.conversation.findUnique({
      where: {
        id: conversationId,
      },
      include: {
        users: true,
        userAdmin: true,
        messages: {
          include: {
            seenBy: true,
            user: true,
            notif: {
              include: {
                user: true,
                users: true,
              },
            },
          },
        },
      },
    });

    res.status(200).json(conversation);
  } catch (error: any) {
    console.log(error.message);
  }
};

export const sendChat = async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const { conversationId, text, urls } = body;
    const userId = req.user?.id as string;

    const updatedConversation = await prisma.$transaction(async (tx) => {
      if (text) {
        await tx.message.create({
          data: {
            conversationId,
            userId: userId,
            text,
            seenByIds: { set: [userId] },
          },
        });
      }

      if (urls.length) {
        await tx.message.createMany({
          data: urls.map((url: string) => ({
            conversationId,
            userId,
            file: url,
            seenByIds: { set: [userId] },
          })),
        });
      }

      const convo = await tx.conversation.update({
        where: {
          id: conversationId,
        },
        data: {
          updatedAt: new Date(),
        },
        include: {
          users: true,
          messages: {
            include: {
              seenBy: true,
              user: true,
              notif: {
                include: {
                  user: true,
                  users: true,
                },
              },
            },
          },
        },
      });

      return convo;
    });

    res.status(200).json(updatedConversation);
  } catch (error: any) {
    console.log(error.message);
  }
};

export const sendGif = async (req: Request, res: Response) => {
  try {
    const { conversationId, gif } = req.body;
    const user = req.user;

    const result = await prisma.conversation.update({
      where: {
        id: conversationId,
      },
      data: {
        updatedAt: new Date(),
        messages: {
          create: {
            userId: user?.id as string,
            gif,
            seenByIds: { set: [user?.id as string] },
          },
        },
      },
      include: {
        users: true,
        messages: {
          include: {
            seenBy: true,
            user: true,
            notif: {
              include: {
                user: true,
                users: true,
              },
            },
          },
        },
      },
    });

    res.status(200).json(result);
  } catch (error: any) {
    console.log(error.message);
  }
};

export const quickReaction = async (req: Request, res: Response) => {
  try {
    const { conversationId, quickReaction } = req.body;
    const user = req.user;

    if (!conversationId || quickReaction.length === 0) {
      res.status(422).json("Conversation ID and Quick Reaction is required");
    }

    const data = await prisma.conversation.update({
      where: {
        id: conversationId,
      },
      data: {
        updatedAt: new Date(),
        messages: {
          create: {
            userId: user?.id as string,
            quickReaction,
            seenByIds: { set: [user?.id as string] },
          },
        },
      },
      include: {
        users: true,
        messages: {
          include: {
            seenBy: true,
            user: true,
            notif: {
              include: {
                user: true,
                users: true
              },
            },
          },
        },
      },
    });

    res.status(200).json(data);
  } catch (error: any) {
    console.log(error.message);
  }
};

export const newQuickReaction = async (req: Request, res: Response) => {
  try {
    const { receiverIds, quickReaction } = req.body;
    const user = req.user;
    const isSelf = receiverIds.every((id: string) => id === user?.id);
    const removeSelf = receiverIds.filter((id: string) => id !== user?.id);
    const isGroupChat = removeSelf.length > 1;

    const existingConvo = await prisma.conversation.findFirst({
      where: {
        isGroupChat,
        userIds: isSelf
          ? { equals: [user?.id as string] }
          : { hasEvery: [user?.id, ...removeSelf] },
      },
    });

    if (existingConvo) {
      const convo = await prisma.conversation.update({
        where: {
          id: existingConvo.id,
        },
        data: {
          updatedAt: new Date(),
          messages: {
            create: {
              userId: user?.id as string,
              quickReaction,
              seenByIds: { set: [user?.id as string] },
            },
          },
        },
        include: {
          users: true,
          messages: {
            include: {
              seenBy: true,
              user: true,
              notif: {
                include: {
                  user: true,
                  users: true,
                },
              },
            },
          },
        },
      });

      res.status(200).json(convo);
      return;
    }

    const newConvo = await prisma.conversation.create({
      data: {
        isGroupChat,
        userIds: isSelf
          ? [user?.id as string]
          : [user?.id as string, ...removeSelf],
        messages: {
          create: {
            userId: user?.id as string,
            quickReaction,
            seenByIds: { set: [user?.id as string] },
          },
        },
      },
      include: {
        users: true,
        messages: {
          include: {
            seenBy: true,
            user: true,
            notif: {
              include: {
                user: true,
                users: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json(newConvo);
  } catch (error: any) {
    console.log(error.message);
  }
};

export const newConvoMessages = async (req: Request, res: Response) => {
  try {
    const query: string[] = JSON.parse(req.query.ids as string);
    const user = req.user;
    const isSelf = query.every((id) => id === user?.id);
    const ids = query.filter((id) => id !== user?.id);
    const isGroupChat = ids.length > 1;

    const results = await prisma.conversation.findFirst({
      where: {
        isGroupChat,
        userIds: isSelf
          ? { equals: [user?.id as string] }
          : { hasEvery: [user?.id as string, ...ids] },
      },
      include: {
        users: true,
        messages: {
          include: {
            seenBy: true,
            user: true,
          },
        },
      },
    });

    res.status(200).json(results);
  } catch (error: any) {
    console.log(error.message);
  }
};

export const newConvo = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const { receiverIds, text } = req.body;
    const isSelf = receiverIds.every((id: string) => id === user?.id);
    const removeSelf = receiverIds.filter((id: string) => id !== user?.id);
    const isGroupChat = removeSelf.length > 1;

    const existingConvo = await prisma.conversation.findFirst({
      where: {
        isGroupChat,
        userIds: isSelf
          ? { equals: [user?.id as string] }
          : { hasEvery: [user?.id, ...removeSelf] },
      },
    });

    if (existingConvo) {
      const convo = await prisma.conversation.update({
        where: {
          id: existingConvo.id,
        },
        data: {
          updatedAt: new Date(),
          messages: {
            create: {
              userId: user?.id as string,
              text,
              seenByIds: { set: [user?.id as string] },
            },
          },
        },
        include: {
          users: true,
          messages: {
            include: {
              seenBy: true,
              user: true,
              notif: {
                include: {
                  user: true,
                  users: true,
                },
              },
            },
          },
        },
      });

      res.status(200).json(convo);
      return;
    }

    const newConvo = await prisma.conversation.create({
      data: {
        isGroupChat,
        userIds: { set: isSelf ? [user?.id] : [user?.id, ...removeSelf] },
        userAdminIds: isGroupChat ? { set: [user?.id as string] } : [],
        messages: {
          create: {
            userId: user?.id as string,
            text,
            seenByIds: { set: [user?.id as string] },
          },
        },
      },
      include: {
        users: true,
        messages: {
          include: {
            seenBy: true,
            user: true,
            notif: {
              include: {
                user: true,
                users: true,
              },
            },
          },
        },
      },
    });

    res.status(200).json(newConvo);
  } catch (error: any) {
    console.log(error.message);
  }
};

export const seenMessage = async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.body;
    const user = req.user;

    /*  await prisma.message.updateMany({
      data: { seenByIds: { set: [] } }
    }); */

    if (!conversationId) {
      res.status(422).json("ConversationId is required");
      return;
    }

    await prisma.message.updateMany({
      where: {
        conversationId,
        NOT: { seenByIds: { has: user?.id } },
      },
      data: {
        seenByIds: { push: user?.id },
      },
    });

    const convo = await prisma.conversation.findUnique({
      where: {
        id: conversationId,
      },
      include: {
        users: true,
        messages: {
          include: {
            seenBy: true,
            user: true,
            notif: {
              include: {
                user: true,
                users: true,
              },
            },
          },
        },
      },
    });

    res.status(200).json(convo);
  } catch (error: any) {
    console.log(error.message);
  }
};

export const archiveConvo = async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.body;
    const user = req.user;

    if (!conversationId) {
      res.status(422).json("ConversationId and archive is required");
    }

    const isAlreadyArchive = await prisma.conversation.findUnique({
      where: {
        id: conversationId,
        archiveByIds: { has: user?.id },
      },
    });

    if (isAlreadyArchive) {
      const updatedIds = isAlreadyArchive.archiveByIds.filter(
        (id) => id !== user?.id
      );
      const unArchive = await prisma.conversation.update({
        where: {
          id: conversationId,
        },
        data: {
          archiveByIds: { set: updatedIds },
        },
      });

      res.status(200).json(unArchive);
      return;
    }

    const data = await prisma.conversation.update({
      where: {
        id: conversationId,
      },
      data: {
        archiveByIds: { push: user?.id as string },
      },
    });

    res.status(201).json(data);
  } catch (error: any) {
    console.log(error.message);
  }
};

export const myArchive = async (req: Request, res: Response) => {
  try {
    const user = req.user;

    const data = await prisma.conversation.findMany({
      where: {
        archiveByIds: { hasEvery: [user?.id as string] },
      },
      orderBy: { updatedAt: "desc" },
      include: {
        messages: {
          include: {
            user: true,
            seenBy: true,
          },
        },
        users: true,
      },
    });

    res.status(200).json(data);
  } catch (error: any) {
    console.log(error.message);
  }
};

export const deleteChat = async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.body;
    const user = req.user;

    if (!conversationId) {
      res.status(422).json("ConversationId is required");
      return;
    }

    /* await prisma.message.updateMany({
      data: {
        deletedByIds: { set: [] }
      },
    }); */

    const message = await prisma.message.findMany({
      where: {
        conversationId,
      },
    });

    const isDeleted = message.every((d) =>
      d.deletedByIds.includes(user?.id as string)
    );

    if (isDeleted) {
      res.status(200).json("Chat already deleted");
      return;
    }

    const deleteMessages = await prisma.message.updateMany({
      where: {
        conversationId,
      },
      data: {
        deletedByIds: { push: [user?.id as string] },
      },
    });

    res.status(200).json(deleteMessages);
  } catch (error: any) {
    console.log(error.message);
  }
};

export const leaveGroupChat = async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.body;
    const user = req.user;

    if (!conversationId) {
      res.status(422).json("ConversationId is required");
      return;
    }

    /* await prisma.message.updateMany({
      data: {
        notif: []
      }
    }); */

    const convo = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: true,
      },
    });

    if (!convo) {
      res.status(404).json("Conversation not found");
      return;
    }

    const latestMessage = convo?.messages?.[convo?.messages.length - 1];

    const data = await prisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.update({
        where: { id: conversationId },
        data: {
          userIds: {
            set: convo?.userIds.filter((id) => id !== user?.id),
          },
        },
        include: {
          users: true,
          userAdmin: true,
          messages: {
            include: {
              seenBy: true,
              user: true,
              notif: {
                include: {
                  user: true,
                  users: true,
                },
              },
            },
          },
        },
      });

      await tx.notif.create({
        data: {
          messageId: latestMessage?.id,
          userId: user?.id as string,
          notifMessage: "left the group.",
        },
      });

      return conversation;
    });

    res.status(200).json(data);
  } catch (error: any) {
    console.log(error.message);
  }
};

export const changeGcName = async (req: Request, res: Response) => {
  try {
    const { conversationId, newName } = req.body;
    const userId = req.user?.id;

    if (!conversationId || !newName) {
      res.status(422).json("ConversationId and newName is required");
    }

    await prisma.$transaction(async (tx) => {
      const convo = await tx.conversation.update({
        where: {
          id: conversationId,
        },
        data: {
          gcName: newName,
        },
        include: {
          messages: true,
        },
      });

      const latestMessageId = convo?.messages?.[convo?.messages.length - 1]?.id;

      await tx.notif.create({
        data: {
          messageId: latestMessageId,
          userId: userId as string,
          notifMessage: `changed the group name to ${newName}.`,
        },
      });
    });

    const convo = await prisma.conversation.findUnique({
      where: {
        id: conversationId,
      },
      include: {
        users: true,
        messages: {
          include: {
            seenBy: true,
            user: true,
            notif: {
              include: {
                user: true,
                users: true,
              },
            },
          },
        },
      },
    });

    res.status(200).json(convo);
  } catch (error: any) {
    console.log(error.message);
  }
};

export const addPeopleInGroupChat = async (req: Request, res: Response) => {
  try {
    const { conversationId, peopleIds } = req.body;
    const userId = req.user?.id as string;

    if (!conversationId || !peopleIds) {
      res.status(422).json("ConversationId and peopleIds is required");
      return;
    }

    await prisma.$transaction(async (tx) => {
      const convo = await tx.conversation.update({
        where: {
          id: conversationId,
        },
        data: {
          userIds: { push: peopleIds },
        },
        include: {
          messages: true,
        },
      });

      const latestMessageId = convo?.messages?.[convo.messages.length - 1]?.id;

      await tx.notif.create({
        data: {
          messageId: latestMessageId,
          userId,
          userIds: peopleIds,
        },
      });
    });

    const convo = await prisma.conversation.findUnique({
      where: {
        id: conversationId,
      },
      include: {
        users: true,
        messages: {
          include: {
            seenBy: true,
            user: true,
            notif: {
              include: {
                user: true,
                users: true,
              },
            },
          },
        },
      },
    });

    res.status(200).json(convo);
  } catch (error: any) {
    console.log(error.message);
  }
};

export const changeGcProfile = async (req: Request, res: Response) => {
  try {
    const { conversationId, photoUrl } = req.body;

    if (!conversationId || !photoUrl) {
      res.status(422).json("ConversationId and photoUrl is required");
      return;
    }

    const isGc = await prisma.conversation.findUnique({
      where: {
        id: conversationId,
      },
    });

    if (!isGc) {
      res.status(409).json("Conversation is not a group chat");
      return;
    }

    const conversation = await prisma.conversation.update({
      where: {
        id: conversationId,
      },
      data: {
        gcProfile: photoUrl,
      },
      include: {
        users: true,
        userAdmin: true,
        messages: {
          include: {
            seenBy: true,
            user: true,
            notif: {
              include: {
                user: true,
                users: true,
              },
            },
          },
        },
      },
    });

    res.status(200).json(conversation);
  } catch (error: any) {
    console.log(error.message);
  }
};

export const makeAdmin = async (req: Request, res: Response) => {
  try {
    const { conversationId, userId } = req.body;

    const isAlreadyAdmin = await prisma.conversation.findUnique({
      where: {
        id: conversationId,
        userAdminIds: { has: userId },
      },
    });

    const removeAsAdmin = isAlreadyAdmin?.userAdminIds.filter((id) => id !== userId);

    if (isAlreadyAdmin) {
      const conversation = await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          userAdminIds: removeAsAdmin,
        },
        include: {
          users: true,
          userAdmin: true,
          messages: {
            include: {
              seenBy: true,
              user: true,
              notif: {
                include: {
                  user: true,
                  users: true,
                },
              },
            },
          },
        },
      });

      res.status(200).json(conversation);
      return;
    };

    const conversation = await prisma.conversation.update({
      where: {
        id: conversationId,
      },
      data: {
        userAdminIds: { push: userId },
      },
      include: {
        users: true,
        userAdmin: true,
        messages: {
          include: {
            seenBy: true,
            user: true,
            notif: {
              include: {
                user: true,
                users: true,
              },
            },
          },
        },
      },
    });

    res.status(200).json(conversation);
  } catch (error: any) {
    console.log(error.message);
  }
};

export const removeMember = async (req: Request, res: Response) => {
  try {
    const { conversationId, userId } = req.body;

    if (!conversationId || !userId) {
      res.status(422).json("ConversationId and userId is required");
      return
    };

    const convoUsers = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    const removeUser = convoUsers?.userIds.filter((id) => id !== userId);

    const conversation = await prisma.conversation.update({
      where: {
        id: conversationId,
      },
      data: {
        userIds: removeUser
      },
      include: {
        users: true,
        userAdmin: true,
        messages: {
          include: {
            seenBy: true,
            user: true,
            notif: {
              include: {
                user: true,
                users: true,
              },
            },
          },
        },
      },
    });

    res.status(200).json(conversation)
  } catch (error: any) {
    console.log(error.message)
  }
};