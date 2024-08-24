import {
    Grid,
    Container,
    Card,
    Text,
    createStyles,
    Badge
  } from '@mantine/core';

import { useChatStore } from "../logic_frontend/ChatStore";

const useStyles = createStyles(() => ({
    pointer: {
        cursor: "pointer",
    },
}));

export default function Page(){

    const demoProps = {
        mt: "10em"
    }

    const { classes } = useStyles();

    const tasks = useChatStore(state => state.tasks);

    return (
        <Container {...demoProps}>
            <Grid>
                <Grid.Col span={3}>
                    <Badge variant="light" color="blue">Tareas pendientes</Badge>
                    {
                        tasks?.map((task) => (
                            <Card
                                className={classes.pointer}
                            >

                                <Text fw={500} size="lg" mt="md">
                                    {task.title}
                                </Text>

                                <Text mt="xs" c="dimmed" size="sm">
                                    {task.description}
                                </Text>
                            </Card>
                        ))
                    }
                </Grid.Col>
                <Grid.Col span={3}>
                    <Badge variant="light" color="blue">Prioridad baja</Badge>
                </Grid.Col>
                <Grid.Col span={3}>
                    <Badge variant="light" color="blue">Prioridad media</Badge>

                </Grid.Col>
                <Grid.Col span={3}>
                    <Badge variant="light" color="blue">Prioridad alta</Badge>

                </Grid.Col>
            </Grid>
        </Container>
    );
}