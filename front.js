//% deno run --allow-net --allow-read --allow-write front.js
import { Application, Router} from "https://deno.land/x/oak/mod.ts";
import { DB } from "https://deno.land/x/sqlite/mod.ts";
import { oakCors } from "https://deno.land/x/cors/mod.ts";
import { viewEngine, engineFactory, adapterFactory } from "https://deno.land/x/view_engine/mod.ts";
import { SmtpClient } from "https://deno.land/x/smtp/mod.ts";



const router = new Router();{
    router.get("/", async function(ctx){
        ctx.render('front.ejs', { data: {} });
    });

    router.post("/ticket", async function(ctx){
        const v = await ctx.request.body().value;
        console.log( v );
        let code;
        const db = new DB("joicon.db");{
            db.query("INSERT INTO TTicket (sEmail) VALUES (?)", [v.email]);
            code = [...db.query("SELECT sCode from TTicket where id=last_insert_rowid()")][0][0];
            console.log(code);
            db.close();
        }

        // send mail
        {
            const smtp = new SmtpClient();
            await smtp.connect({
              hostname: "127.0.0.1",
            });
            await smtp.send({
                from: '"joicon" <aaa@aaa.aaa>',
                to: v.email,
                subject: "your ticket code is",
                content: code,
            });
            await smtp.close();
            console.log("a mail was sent. ", v.email);
        }

        ctx.response.body = { message: "OK" };
    });

    router.post("/", async function(ctx){
        const v = await ctx.request.body().value;
        console.log( v );
        let code;

        const db = new DB("joicon.db");
        db.query("BEGIN");
        try{
            db.query("UPDATE TTicket SET dUsed=CURRENT_TIMESTAMP WHERE sEmail=? and sCode=? and dUsed is NULL", [v.email, v.ticket]);
            if(db.changes === 1){
                db.query("INSERT INTO TEntry (sName,nAge,sEmail,sCode,sClass,sTitle,sPR,bThumb,bVideo,bFile) VALUES (?,?,?,?,?,?,?,?,?,?)",
                    [v.name, v.age, v.email, v.ticket, v.class, v.title, v.pr, v.thumb, v.video, v.file]);
                code = v.ticket;
            }
            db.query("COMMIT");
        }catch(e){
            console.log(e);
            db.query("ROLLBACK");
        }
        db.close();

        if(code){
            ctx.response.body = { message: "OK", code: code };
        }else{
            ctx.response.body = { message: "NG", reason: "check your email and ticket." };
        }
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


