//% deno run --allow-net --allow-read --allow-write front.js
import { Application, Router, send } from "https://deno.land/x/oak/mod.ts";
import { DB } from "https://deno.land/x/sqlite/mod.ts";
import { oakCors } from "https://deno.land/x/cors/mod.ts";
// import { SmtpClient } from "https://deno.land/x/smtp/mod.ts";
import { SmtpClient } from "https://raw.githubusercontent.com/yrm006/deno-smtp/master/smtp.ts";



const router = new Router();{
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
            console.log("a ticket mail was sent. ", v.email);
        }

        ctx.response.body = { message: "OK" };
    });

    router.post("/", async function(ctx){
        const v = await ctx.request.body().value;
        console.log( v );
        let code;
        let reason = "unknown";

        const db = new DB("joicon.db");
        db.query("BEGIN");{
            db.query("UPDATE TTicket SET dUsed=CURRENT_TIMESTAMP WHERE sEmail=? and sCode=? and dUsed is NULL", [v.email, v.ticket]);
            if(db.changes === 1){
                db.query("INSERT INTO TEntry (sName,nAge,sEmail,sCode,sClass,sTitle,sPR,bThumb,bVideo,bFile) VALUES (?,?,?,?,?,?,?,?,?,?)",
                    [v.name, v.age, v.email, v.ticket, v.class, v.title, v.pr, v.thumb, v.video, v.file]);
                db.query("COMMIT");
                code = v.ticket;
            }else{
                reason = "check your email-address and ticket-code.";
            }
            db.close();
        }

        if(code){
            // send mail
            {
                const body = `\
We have accepted your work:
    Title: ${v.title}
    Class: ${v.class}
    PR: ${v.pr?.length ?? 0} byte
    Source: ${v.file?.length ?? 0} byte
    Video: ${v.video?.length ?? 0} byte
    Thumb: ${v.thumb?.length ?? 0} byte

Thank you,
---
Programming Club Network
`;
                const smtp = new SmtpClient();
                await smtp.connect({
                hostname: "127.0.0.1",
                });
                await smtp.send({
                    from: '"joicon" <aaa@aaa.aaa>',
                    to: v.email,
                    subject: "thank you!",
                    content: body,
                });
                await smtp.close();
                console.log("a accepted mail was sent. ", v.email);
            }

            ctx.response.body = { message: "OK", code: code };
        }else{
            ctx.response.body = { message: "NG", reason: reason };
        }
    });
}

const app = new Application();{
    const port = 8090;

    app.use(oakCors());
    app.use(router.routes());
    app.use(router.allowedMethods());
    app.use(async function(ctx){
        await send(ctx, ctx.request.url.pathname, {
            root: `${Deno.cwd()}/frontwww`,
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


