import { DB } from "https://deno.land/x/sqlite/mod.ts";

const db = new DB("joicon.db");
const queries = (await Deno.readTextFile("joicon.db.sql")).split(";");
for (const q of queries) {
    if (q.trim().length == 0) {
        break;
    }
    const res = db.query(q);
    console.log(res);
}
db.close();
