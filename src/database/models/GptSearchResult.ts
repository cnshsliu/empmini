import { Schema, InferSchemaType, HydratedDocument, model } from "mongoose";
interface ITimestamp {
	_id: Schema.Types.ObjectId | string;
	createdAt: Date;
	updatedAt: Date;
}

const schema = new Schema(
	{
		account: { type: String, required: [true, "不能为空"], index: true },
		site: { type: String },
		search_uuid: { type: String },
		query: { type: String },
		url: { type: String },
		content: { type: String },
		textContent: { type: String },
		deleted: { type: Boolean, default: false, index: true },
	},
	{ timestamps: true },
);

export type GptSearchResultDataType = InferSchemaType<typeof schema>;
export type GptSearchResultType = HydratedDocument<InferSchemaType<typeof schema>> & ITimestamp;
export const GptSearchResult = model("GptSearchResult", schema);
