'use client';
import TopicCard from "../components/TopicCard";
import { Grid } from '@mantine/core';
import { useChatStore } from "../logic_frontend/ChatStore";

export default function Page(){

    var classifiers = [];

    classifiers.push(
        {
            id: "1",
            title: "Chakira",
            createdAt: new Date(),
            image : "https://images.unsplash.com/photo-1437719417032-8595fd9e9dc6?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=600&q=80",
            num_chats: 10
        }
    )

    return (
        <main style={{marginTop: "1em", width: "99%"}}>
            <Grid>
            {

                classifiers?.map((classifier) => (
                    <Grid.Col span={4} key={classifier.id}>
                        <TopicCard 
                            classifier={classifier}                         
                        />
                    </Grid.Col>
                ))
            
            }
            </Grid>
        </main>
    );
}