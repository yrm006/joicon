//% deno run --allow-net --allow-read --allow-write back.js
import { Application, Router, send } from "https://deno.land/x/oak/mod.ts";
import { DB } from "https://deno.land/x/sqlite/mod.ts";
import { oakCors } from "https://deno.land/x/cors/mod.ts";
import { decode as base64decode } from "https://deno.land/std@0.95.0/encoding/base64.ts";
import { Buffer } from "https://deno.land/std@0.95.0/io/buffer.ts";



async function doAuth(ctx, next){
    let authed = false;{
        const auth = ctx.request.headers.get("Authorization");
        if(auth){
            const userpass = (new TextDecoder().decode(base64decode( auth.split(" ")[1] ))).split(":");
            authed = ( userpass[0]==="admin" && userpass[1]==="1234" );
        }
    }

    if(authed){
        await next();
    }else{
        ctx.response.status = 401;
        ctx.response.headers.set("WWW-Authenticate", 'Basic');
    }
}

const router = new Router();{
    router.get("/dashboard", async function(ctx){
        let r = null;
        const db = new DB("joicon.db");{
            r = [...db.query("select (select count(*) from TEntry) as nEntries, (select count(*) from TJudge) as nJudges").asObjects()];
            db.close();
        }
        ctx.response.body = r[0];
    });

    router.get("/entries", async function(ctx){
        let r = null;
        const db = new DB("joicon.db");{
            r = [...db.query("select id,sTitle,bThumb,datetime(TEntry.dCreated,'+9 hours') as dCreatedJST,(select sum(nJudgment) from TJudgment where pEntry=id) as nJudgment,(select GROUP_CONCAT(sComment, char(10)) from TJudgment where pEntry=id) as sComments from TEntry order by id").asObjects()];
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
            //### This will eat up too much memory
            r = [...db.query("select id,sName,nAge,sCode,sClass,sTitle,sPR,bThumb,bVideo,datetime(dCreated,'+9 hours') as dCreatedJST from TEntry order by id")];
            db.close();
        }
        ctx.response.type = "application/octet-stream";
        ctx.response.body = r;
    });

    router.get("/download.csv", async function(ctx){
        const buf = new Buffer();
        const te = new TextEncoder();

        const db = new DB("joicon.db");{
            const rows = db.query("select id,sName,nAge,sCode,sClass,sTitle,datetime(dCreated,'+9 hours') as dCreatedJST,(select GROUP_CONCAT(sComment, char(10)) from TJudgment where pEntry=id) as sComments from TEntry order by id");
            for(const col of rows.columns()){
                buf.write( te.encode(col.name) );
                buf.write( te.encode("\t") );
            }
            buf.write( te.encode("\n") );

            let row;
            while( (row = rows.next()).value ){
                for(const val of row.value){
                    buf.write( te.encode('"') );
                    buf.write( te.encode(val?.replace ? val.replace(/"/g, '""') : val) );
                    buf.write( te.encode('"\t') );
                }
                buf.write( te.encode("\n") );
            }

            db.close();
        }
        ctx.response.type = "application/octet-stream";
        ctx.response.body = buf.bytes({copy:false});
    });

    router.get("/judges", async function(ctx){
        let r = null;
        const db = new DB("joicon.db");{
            r = [...db.query("select id,sName,sPass,(select count(*) from TJudgment where pJudge=id) as nJudged from TJudge order by id").asObjects()];
            db.close();
        }
        ctx.response.body = r;
    });

    router.post("/add_judge", async function(ctx){
        const v = await ctx.request.body().value;
        console.log( v );

        const db = new DB("joicon.db");{
            db.query("INSERT INTO TJudge (sName,sPass) VALUES (?,?)", [v.name, v.pass]);
            db.close();
        }
        ctx.response.body = { message: "OK" };
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


