const listeners = new Map();
let isshuttingdown = false;
function Add_Listener(req, res) {
    if (isshuttingdown) {
        res.statusCode = 503;
        res.end();
        return;
    }
    const id = req.query.id;
    const l = listeners.get(id);
    if (l) {
        listeners.delete(id);
    }
    listeners.set(id, {
        id,
        cb: (trigger, data)=>{
            res.write(`event: ${trigger}\n`);
            res.write(`data: ${JSON.stringify(data)}\n`);
            res.write('\n');
        },
        endit: ()=>{
            res.end();
        },
        checkit: ()=>{
            if (res.writable && !res.destroyed && !res.writableEnded) {
                res.write(':\n\n'); // Send a comment to keep the connection alive
            } else {
                cleanUp(id);
            }
        }
    });
    console.info(`New SSE listener: ${id} with listeners count: ${listeners.size}`);
    res.socket.setNoDelay(true);
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': "keep-alive",
        'Access-Control-Allow-Origin': '*'
    });
    res.write('event: connected\n');
    res.write('data: { "message": "hey connected" }\n');
    res.write('retry: 15000\n');
    res.write('\n');
    req.on('close', ()=>{
        cleanUp(id);
    });
    req.on('finish', ()=>{
        cleanUp(id);
    });
    req.on('error', ()=>{
        console.log("req.on error");
        cleanUp(id);
    });
}
function TriggerEvent(eventname, data, opts = {}) {
    listeners.forEach((l)=>{
        if (opts.exclude && opts.exclude.includes(l.id)) return;
        l.cb(eventname, data);
    });
}
function TriggerEventOne(eventname, sse_id, data) {
    const listener = listeners.get(sse_id);
    if (!listener) return false;
    listener.cb(eventname, data);
    return true;
}
function cleanUp(id) {
    const listener = listeners.get(id);
    if (!listener) return;
    listener.endit();
    listeners.delete(id);
}
function routinemaintenance() {
    listeners.forEach((l)=>{
        l.checkit();
    });
}
setTimeout(routinemaintenance, 30000);
/*
function remove_listener(l:Listener) {

    l.httpres.destroy()
    listeners.delete(l.unique_identifier)
}
*/ process.on('SIGTERM', ()=>{
    isshuttingdown = true;
    console.info('Received SIGTERM signal. Cleaning up SSE listeners.');
    listeners.forEach((listener)=>{
        try {
            listener.endit();
            listeners.delete(listener.id);
        } catch (e) {
            console.error(`Error while ending listener ${listener.id}:`, e);
        }
    });
    listeners.clear();
    setTimeout(()=>{
        process.exit(0);
    }, 5000);
});
export default {
    Add_Listener,
    TriggerEvent,
    TriggerEventOne
};
