import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import { Strategy as GoogleStrategy } from "passport-google-oauth2";
import { Strategy as FacebookStrategy } from "passport-facebook";
import bcrypt from "bcrypt";
import "dotenv/config";
import prisma from "../db/config.js";

// FOR ADMIN AUTHENTICATE PASSPORT  USE
passport.use(
  "admin",
  new LocalStrategy(
    { usernameField: "email", passwordField: "password" },
    async (usernameField, passwordField, done) => {
      try {
        const validUser = await prisma.adminMaster.findFirst({
          where: {
            OR: [{ userName: usernameField }, { email: usernameField }],
          },
        });
        if (!validUser)
          return done(null, false, { message: "Invalid email or password!" });
        const comparePassword = await bcrypt.compare(
          passwordField,
          validUser.password
        );
        if (!comparePassword)
          return done(null, false, { message: "email or password wrong!" });
        return done(null, validUser, { message: "LogIn successfully." });
      } catch (error) {
        return done(error);
      }
    }
  )
);

// FOR USER AUTHENTICATE PASSPORT  USE
passport.use(
  "user",
  new LocalStrategy(
    { usernameField: "email", passwordField: "password" },
    async (usernameField, passwordField, done) => {
      try {
        const validUser = await prisma.users.findFirst({
          where: {
            email: usernameField,
          },
        });
        if (!validUser)
          return done(null, false, { message: "Invalid email or password!" });
        const comparePassword = await bcrypt.compare(
          passwordField,
          validUser.password
        );
        if (!comparePassword)
          return done(null, false, { message: "email or password wrong!" });
        return done(null, validUser, { message: "LogIn successfully." });
      } catch (error) {
        console.log("Errrorrorooror ===============<>", error);
        return done(error);
      }
    }
  )
);

const jwtOptions = {
  secretOrKey: process.env.TOKEN_SECRET,
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
};

// passport.use(
//   new JwtStrategy(jwtOptions, async (payload, done) => {
//     try {
//       const user = await prisma.adminMaster.findUnique({
//         where: { id: payload.id },
//       });
//       if (!user) return done(null, false);
//       return done(null, user);
//     } catch (error) {
//       return done(error, null);
//     }
//   })
// );

passport.use(
  new JwtStrategy(jwtOptions, async (payload, done) => {
    try {
      let user;

      if (payload.type === "admin") {
        user = await prisma.adminMaster.findUnique({
          where: { id: payload.id },
        });
      } else if (payload.type === "user") {
        user = await prisma.users.findUnique({
          where: { id: payload.id },
        });
      }

      if (!user) {
        return done(null, false);
      }

      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  })
);

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const { displayName, emails, photos, name } = profile;
        const email = emails && emails.length > 0 ? emails[0].value : null;
        const firstName = name.givenName || "";
        const lastName = name.familyName || "";
        const provider_id = profile?.id;

        if (!provider_id) {
          throw new Error("Something went wrong, please try again!");
        }
        let user = await prisma.users.findFirst({
          where: { provider_id: provider_id },
        });

        if (!user) {
          user = await prisma.users.create({
            data: {
              name: `${firstName} ${lastName}`,
              email: email,
              provider_id: profile?.id,
              provider: profile?.provider,
              // image: picture,
            },
          });
        }

        return done(null, user);
      } catch (error) {
        console.log("errrr ====. ", error);
        return done(error);
      }
    }
  )
);

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      callbackURL: process.env.FACEBOOK_CALLBACK_URL,
      profileFields: [
        "id",
        "displayName",
        "email",
        "picture.type(large)",
        "gender",
      ],
    },
    async (request, accessToken, refreshToken, profile, done) => {
      const { displayName, emails, photos, provider, id, name } = profile;
      const firstName = name.givenName || null;
      const lastName = name.familyName || null;

      if (!id) {
        throw new Error("Something went wrong, please try again!");
      }
      let user = await prisma.users.findFirst({
        where: { provider_id: id },
      });

      if (!user) {
        user = await prisma.users.create({
          data: {
            name: `${firstName} ${lastName}`,
            email: emails || "",
            provider_id: id,
            provider: profile?.provider,
          },
        });
      }

      return done(null, user);
    }
  )
);

const isAuthenticated = (req, res, next) => {
  passport.authenticate("jwt", { session: false }, (err, user, info) => {
    if (err) {
      return res.status(500).json({
        isSuccess: false,
        message: "Something went wrong, please try again!",
        error: err,
      });
    }
    if (!user) {
      return res
        .status(401)
        .json({ isSuccess: false, message: "Unauthorized" });
    }
    req.user = user;
    next();
  })(req, res, next);
};

export default passport;
export { isAuthenticated };
