import bcrypt from 'bcryptjs';
import { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import jwt from 'jsonwebtoken';

export async function register(req: Request, res: Response) {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      res.status(409).json("Something went wrong");
      return;
    }

    const user = await prisma.user.findUnique({
      where: {
        email
      }
    })

    if (user?.email) {
      res.json({ error: "Email is already exist" });
      return;
    };

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const createNewUser = await prisma.user.create({
      data: {
        username,
        email,
        password: hash
      },
    })

    res.status(200).json({ success: createNewUser });
  } catch (error: any) {
    console.log(error.message);
    res.status(500).json(error.message)
  }
};

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(409).json("Something went wrong");
      return;
    };

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
      omit: {
        password: false
      }
    });

    if (!user?.email) {
      res.json({ error: "Email does not exist" });
      return;
    };

    const verifiedPassword = await bcrypt.compare(password, user.password);

    if (verifiedPassword === false) {
      res.json({ error: "Email or password is incorrect" });
      return;
    };

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET_KEY!);

    res.cookie("access_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 100000000000
    })

    res.status(200).json({ success: "Login successfully" });
  } catch (error: any) {
    console.log(error.message);
    res.status(500).json(error.message);
  }
};

export async function logout(req: Request, res: Response) {
  try {
    res.clearCookie("access_token");
    res.status(200).json({ success: "Logout successfully" });
  } catch (error: any) {
    console.log(error.message);
  }
}

export async function getUser(req: Request, res: Response) {
  try {
    const user = req.user;
    res.status(200).json(user);
  } catch (error: any) {
    console.log(error.message);
  }
};

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const accessToken = req.cookies.access_token;

    if (!accessToken) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const verifyToken = jwt.verify(accessToken, process.env.JWT_SECRET_KEY!) as { id: string };

    if (!verifyToken.id) {
      res.status(409).json({ error: "Invalid token" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: {
        id: verifyToken.id,
      },
    });

    if (!user || !user.id) {
      res.status(498).json({ error: "Invalid token" });
      return;
    }

    req.user = user;
    next();
  } catch (error: any) {
    console.log(error.message);
  }
};

export async function searchMessenger(req: Request, res: Response) {
  try {
    const search = req.query.search as string;

    const messengers = await prisma.user.findMany({
      where: {
        username: {
          contains: search,
          mode: 'insensitive'
        }
      }
    })

    res.status(200).json(messengers);
  } catch (error: any) {
    console.log(error.message)
  }
};

export async function changeProfile(req: Request, res: Response) {
  try {
    const { url } = req.body;
    const user = req.user;

    const newProfile = await prisma.user.update({
      where: {
        id: user?.id
      },
      data: {
        profile: url
      },
    });

    res.status(200).json(newProfile);
  } catch (error: any) {
    console.log(error.message);
  }
};

export async function editProfile(req: Request, res: Response) {
  try {
    const { username, email } = req.body;
    const user = req.user;

    const editedProfile = await prisma.user.update({
      where: {
        id: user?.id
      },
      data: {
        username,
        email,
      }
    });

    res.status(200).json(editedProfile);
  } catch (error: any) {
    console.log(error.message)
  }
};

export const searchPeopleToAdd = async (req: Request, res: Response) => {
  try {
    const { alreadyAdded, searchPeople } = req.body;

    if (!searchPeople) {
      const users = await prisma.user.findMany({
        where: {
          id: {
            notIn: alreadyAdded
          }
        }
      });

      res.status(200).json(users);
      return;
    }

    const peoples = await prisma.user.findMany({
      where: {
        AND: [
          {
            id: {
              notIn: alreadyAdded
            }
          },
          {
            username: {
              contains: searchPeople,
              mode: "insensitive"
            },
          }
        ]
      }
    });

    res.status(200).json(peoples);
  } catch (error: any) {
    console.log(error.message)
  }
}