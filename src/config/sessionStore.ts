import MongoStore from "connect-mongo";

import { MONGODB_URI } from "./keys.js";

const mongoStore = MongoStore.create({ mongoUrl: MONGODB_URI });

export default mongoStore;
