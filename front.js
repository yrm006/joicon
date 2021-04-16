//% deno run --allow-net --allow-read --allow-write front.js
import { Application, Router} from "https://deno.land/x/oak/mod.ts";
import { DB } from "https://deno.land/x/sqlite/mod.ts";
import { oakCors } from "https://deno.land/x/cors/mod.ts";
import { viewEngine, engineFactory, adapterFactory } from "https://deno.land/x/view_engine/mod.ts";



const router = new Router();{
    router.get("/", async function(ctx){
        ctx.render('front.ejs', { data: {} });
    });

    router.post("/", async function(ctx){
        const v = await ctx.request.body().value;
        console.log( v );
        let id = 0;
        const db = new DB("joicon.db");{
            db.query("INSERT INTO TEntry (sName,nAge,sEmail,sClass,sTitle,sPR,bThumb,bVideo,bFile) VALUES (?,?,?,?,?,?,?,?,?)",
                [v.name, v.age, v.email, v.class, v.title, v.pr, v.thumb, v.video, v.file]);
            id = [...db.query("SELECT last_insert_rowid()")][0][0];
            console.log(id);
            db.close();
        }
        ctx.response.body = { message: "OK", id: id };
    });
}

const app = new Application();{
    const port = 8090;

    app.use(oakCors());
    app.use(viewEngine(adapterFactory.getOakAdapter(), engineFactory.getEjsEngine()));
    app.use(router.routes());
    app.use(router.allowedMethods());
                                                                        console.log('running on port ', port);
    await app.listen({
        port: port,
        secure: false,//!!!
        certFile: "server_crt.pem",
        keyFile: "server_key.pem",
    });
}

