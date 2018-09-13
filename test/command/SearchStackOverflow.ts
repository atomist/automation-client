import {
    Attachment,
    SlackMessage,
} from "@atomist/slack-messages";
import axios from "axios";
import {
    CommandHandler,
    Parameter,
    Tags,
} from "../../lib/decorators";
import { HandleCommand } from "../../lib/HandleCommand";
import { HandlerContext } from "../../lib/HandlerContext";
import { HandlerResult } from "../../lib/HandlerResult";

const apiSearchUrl =
    `http://api.stackexchange.com/2.2/search/advanced?pagesize=3&order=desc&sort=relevance&site=stackoverflow&q=`;
const webSearchUrl = `http://stackoverflow.com/search?order=desc&sort=relevance&q=`;
const thumbUrl = "https://slack-imgs.com/?c=1&o1=wi75.he75&url=https%3A%2F%2Fcdn.sstatic.net" +
    "%2FSites%2Fstackoverflow%2Fimg%2Fapple-touch-icon%402.png%3Fv%3D73d79a89bded";

@CommandHandler("Query Stack Overflow", "search so")
@Tags("stack-overflow")
export class SearchStackOverflow implements HandleCommand {

    @Parameter({ description: "your search query", pattern: /^.*$/, required: true })
    public query: string;

    public handle(ctx: HandlerContext): Promise<HandlerResult> {
        return axios.get(`${apiSearchUrl}${encodeURIComponent(this.query)}`)
            .then(res => Promise.resolve(this.handleResult(res, this.query)))
            .then(msg => {
                return ctx.messageClient.respond(msg);
            })
            .then(() => Promise.resolve({ code: 0 }));
    }

    private handleResult(result, query: string): SlackMessage {
        const data = result.data;
        const msg: SlackMessage = {};
        msg.attachments = (data.items.map(i => {
            const attachment: Attachment = {
                fallback: i.title,
                author_name: i.owner.display_name,
                author_link: i.owner.link,
                author_icon: i.owner.profile_image,
                title: i.title,
                title_link: i.link,
                thumb_url: thumbUrl,
                footer: i.tags.join(", "),
                ts: i.last_activity_date,
            };
            return attachment;
        }));

        if (data.items === null || data.items.length === 0) {
            msg.text = "No results found";
        } else {
            msg.attachments.push({
                fallback: "Show more...",
                title: "Show more...",
                title_link: `${webSearchUrl}${encodeURIComponent(query)}`,
            });
        }
        return msg;
    }
}
