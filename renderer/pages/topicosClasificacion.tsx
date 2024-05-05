'use client';
import TopicCard from "../components/TopicCard";
import { Grid, Button } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { useChatStore } from "../logic_frontend/ChatStore";

export default function Page(){

    const classifiers = useChatStore(state => state.classifiers);

    function eliminarTodosLosTopicos(){
        useChatStore.setState({ classifiers: [] });
    }

    return (
        <main style={{width: "99%", marginTop: "1rem"}}>
            <Grid>
            {
            classifiers?.length > 0 && <Grid.Col span={12}>
                <Button
                    variant="light"
                    color="red"
                    onClick={() => eliminarTodosLosTopicos()}
                >
                    <IconTrash size={14} />
                    <span style={{ marginLeft: '10px' }}>Remove all topics</span>
                </Button>
            </Grid.Col>
            }
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