'use client';
import TopicCard from "../components/TopicCard";
import { Grid, Button } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { useChatStore } from "../logic_frontend/ChatStore";
import {notifications} from '@mantine/notifications';

export default function Page(){

    const classifiers = useChatStore(state => state.classifiers);

    function eliminarTodosLosTopicos(){
        useChatStore.setState({ classifiers: [] });
        
        window.ipc.send('eliminar_todas_imagenes_clasificacion', {});
        window.ipc.on('eliminar_todas_imagenes_clasificacion', (mensaje: string) => {
            notifications.show({
              title: "Action finished",
              message: mensaje,
              color: "red",
            });
            window.ipc.off('eliminar_todas_imagenes_clasificacion');
        });
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
                    <span style={{ marginLeft: '10px' }}>Remover todos los tópicos</span>
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