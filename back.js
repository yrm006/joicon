//% deno run --allow-net --allow-read --allow-write back.js
import { Application, Router, send } from "https://deno.land/x/oak/mod.ts";
import { DB } from "https://deno.land/x/sqlite/mod.ts";
import { oakCors } from "https://deno.land/x/cors/mod.ts";



const router = new Router();{
    router.get("/entries", async function(ctx){
        let r = null;
        const db = new DB("joicon.db");{
            r = [...db.query("select id,sTitle,bThumb from TEntry order by id").asObjects()];
            db.close();
        }
        ctx.response.body = r;
    });

    router.get("/entry", async function(ctx){
        let r = null;
        let id = Number.parseInt(ctx.request.url.searchParams.get("id"));
        const db = new DB("joicon.db");{
            r = [...db.query("select * from TEntry where id=?", [id]).asObjects()];
            db.close();
        }
        ctx.response.body = r[0];
    });

    router.get("/download.json", async function(ctx){
        let r = null;
        const db = new DB("joicon.db");{
            r = [...db.query("select * from TEntry order by id")];
            db.close();
        }
        ctx.response.type = "application/octet-stream";
        ctx.response.body = r;
    });
}

const app = new Application();{
    const port = 8091;

    app.use(oakCors());
    app.use(router.routes());
    app.use(router.allowedMethods());
    app.use(async function(ctx){
        await send(ctx, ctx.request.url.pathname, {
            root: `${Deno.cwd()}/backwww`,
            index: "index.html",
        });
    });
                                                                        console.log('running on port ', port);
    await app.listen({
        port: port,
        secure: false,//!!!
        certFile: "server_crt.pem",
        keyFile: "server_key.pem",
    });
}


