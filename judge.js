//% deno run --allow-net --allow-read --allow-write judge.js
import { Application, Router, send } from "https://deno.land/x/oak/mod.ts";
import { DB } from "https://deno.land/x/sqlite/mod.ts";
import { oakCors } from "https://deno.land/x/cors/mod.ts";
import { decode as base64decode } from "https://deno.land/std@0.95.0/encoding/base64.ts";



async function doAuth(ctx, next){
    let id;
    let user;{
        const auth = ctx.request.headers.get("Authorization");
        if(auth){
            const userpass = (new TextDecoder().decode(base64decode( auth.split(" ")[1] ))).split(":");

            const db = new DB("joicon.db");{
                const r = [...db.query("select id,sName from TJudge where sName=? and sPass=?", [userpass[0], userpass[1]]).asObjects()][0];
                id = r?.id;
                user = r?.sName;
                db.close();
            }
        }
    }

    if(user){
        console.log(`'${user}' accessed.`);
        ctx.judgeid = id;
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
            r = [...db.query("select id,sTitle,bThumb,datetime(TEntry.dCreated,'+9 hours') as dCreatedJST,nJudgment from TEntry left outer join TJudgment on TEntry.id=TJudgment.pEntry and TJudgment.pJudge=? order by id", [ctx.judgeid]).asObjects()];
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

    router.post("/judgment", async function(ctx){
        const v = await ctx.request.body().value;
        console.log( v );

        const db = new DB("joicon.db");
        db.query("BEGIN");{
            for(const j of v){
                db.query("DELETE FROM TJudgment WHERE pJudge=? and pEntry=?", [ctx.judgeid, j.entryid]);
                if(j.judgment){
                    db.query("INSERT INTO TJudgment (pJudge,pEntry,nJudgment) VALUES (?,?,?)", [ctx.judgeid, j.entryid, j.judgment]);
                }
                // db.query("UPDATE TJudgment set nJudgment=?,dJudged=CURRENT_TIMESTAMP WHERE pJudge=? and pEntry=?", [j.judgment??0, ctx.judgeid, j.entryid]);
            }
            db.query("COMMIT");
            db.close();
        }
        ctx.response.body = { message: "OK" };
    });
}

const app = new Application();{
    const port = 8092;

    app.use(doAuth);
    app.use(oakCors());
    app.use(router.routes());
    app.use(router.allowedMethods());
    app.use(async function(ctx){
        await send(ctx, ctx.request.url.pathname, {
            root: `${Deno.cwd()}/judgewww`,
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


