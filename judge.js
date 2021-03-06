//% deno run --allow-net --allow-read --allow-write judge.js
import { Application, Router, send } from "https://deno.land/x/oak/mod.ts";
import { DB } from "https://deno.land/x/sqlite/mod.ts";
import { oakCors } from "https://deno.land/x/cors/mod.ts";
import { decode as base64decode } from "https://deno.land/std@0.95.0/encoding/base64.ts";



async function doAuth(ctx, next){
    const auth = ctx.request.headers.get("Authorization");
    if(auth){
        const userpass = (new TextDecoder().decode(base64decode( auth.split(" ")[1] ))).split(":");

        const db = new DB("joicon.db");{
            ctx.judge = [...db.query("select id,sName from TJudge where sName=? and sPass=?", [userpass[0], userpass[1]]).asObjects()][0];
            db.close();
        }
    }

    if(ctx.judge){
        console.log(`'${ctx.judge.sName}' accessed.`);
        await next();
    }else{
        ctx.response.status = 401;
        ctx.response.headers.set("WWW-Authenticate", 'Basic');
    }
}

const router = new Router();{
    router.get("/judge", async function(ctx){
        ctx.response.body = { name: ctx.judge.sName };
    });

    router.get("/logout", async function(ctx){
        console.log(`'${ctx.judge.sName}' logged out.`);
        ctx.response.status = 401;
        ctx.response.headers.set("WWW-Authenticate", 'Basic');
        ctx.response.body = { message: "OK" };
    });

    router.get("/entries", async function(ctx){
        let r = null;
        const db = new DB("joicon.db");{
            r = [...db.query("select id,sTitle,bThumb,datetime(TEntry.dCreated,'+9 hours') as dCreatedJST,nJudgment,sComment from TEntry left outer join TJudgment on TEntry.id=TJudgment.pEntry and TJudgment.pJudge=? order by id", [ctx.judge.id]).asObjects()];
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
        try{
            db.query("BEGIN");

            for(const j of v){
                db.query("DELETE FROM TJudgment WHERE pJudge=? and pEntry=?", [ctx.judge.id, j.entryid]);
                if(j.judgment){
                    if(j.comment.length === 0) throw { message: `Write some comments for ${j.entryid}.` };
                    db.query("INSERT INTO TJudgment (pJudge,pEntry,nJudgment,sComment) VALUES (?,?,?,?)", [ctx.judge.id, j.entryid, j.judgment, j.comment]);
                }else
                if(0 < j.comment.length){
                    throw { message: `Don't comment on ${j.entryid} that aren't judged` };
                }
            }

            // const sum = [...db.query("select sum(nJudgment) from TJudgment where pJudge=?", [ctx.judge.id])][0][0];
            // if(sum === 1.0){
                db.query("COMMIT");
                ctx.response.body = { message: "OK" };
            // }else{
            //     ctx.response.body = { message: "Make the total 1.0." };
            // }
        }catch(e){
            ctx.response.body = e;
        }
        db.close();
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


