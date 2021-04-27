//% deno run --allow-net --allow-read --allow-write back.js
import { Application, Router, send } from "https://deno.land/x/oak/mod.ts";
import { DB } from "https://deno.land/x/sqlite/mod.ts";
import { oakCors } from "https://deno.land/x/cors/mod.ts";
import { decode as base64decode } from "https://deno.land/std@0.95.0/encoding/base64.ts";



async function doAuth(ctx, next){
    let user;{
        const auth = ctx.request.headers.get("Authorization");
        if(auth){
            const userpass = (new TextDecoder().decode(base64decode( auth.split(" ")[1] ))).split(":");

            const db = new DB("joicon.db");{
                user = [...db.query("select name from TJudge where name=? and pass=?", [userpass[0], userpass[1]]).asObjects()][0]?.name;
                db.close();
            }
        }
    }

    if(user){
        console.log(`'${user}' accessed.`);
        await next();
    }else{
        ctx.response.status = 401;
        ctx.response.headers.set("WWW-Authenticate", 'Basic');
    }
}

const router = new Router();{
    router.get("/entries", async function(ctx){
        let r = null;
        const db = new DB("joicon.db");{
            r = [...db.query("select id,sTitle,bThumb,datetime(dCreated,'+9 hours') as dCreatedJST from TEntry order by id").asObjects()];
            db.close();
        }
        ctx.response.body = r;
    });

    router.get("/entry", async function(ctx){
        let r = null;
        let id = Number.parseInt(ctx.request.url.searchParams.get("id"));
        const db = new DB("joicon.db");{
            r = [...db.query("select id,sName,nAge,sCode,sClass,sTitle,sPR,bThumb,bVideo,datetime(dCreated,'+9 hours') as dCreatedJST from TEntry where id=?", [id]).asObjects()];
            db.close();
        }
        ctx.response.body = r[0];
    });

    router.get("/download.json", async function(ctx){
        let r = null;
        const db = new DB("joicon.db");{
            r = [...db.query("select id,sName,nAge,sCode,sClass,sTitle,sPR,bThumb,bVideo,datetime(dCreated,'+9 hours') as dCreatedJST from TEntry order by id")];
            db.close();
        }
        ctx.response.type = "application/octet-stream";
        ctx.response.body = r;
    });
}

const app = new Application();{
    const port = 8091;

    app.use(doAuth);
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
        // secure: true,
        // certFile: "server_crt.pem",
        // keyFile: "server_key.pem",
    });
}


