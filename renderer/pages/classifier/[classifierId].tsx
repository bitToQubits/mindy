import { useRouter } from "next/router";
import { useChatStore } from "../../logic_frontend/ChatStore";
import ChatCard  from "../../components/ChatCard";
import { Grid } from '@mantine/core';

export default function Page() {
    const router = useRouter();
    const classifierID = router.query.classifierId as string | undefined;

    const chats 
    = useChatStore(state => state.chats.filter(c => c.classifier 
    === classifierID));

    return (
        <main style={{width: "99%"}}>
            <Grid>
            {
                chats?.map((chat) => (
                    <Grid.Col span={4} key={chat.id}>
                        <ChatCard 
                            chat={chat}
                        />
                    </Grid.Col>
                ))
            }
            </Grid>
        </main>
    )
}