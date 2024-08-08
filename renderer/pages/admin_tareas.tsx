import {
    Grid,
    Container,
    Card,
    Text,
    createStyles,
    Title,
    Badge
  } from '@mantine/core';

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

    return (
        <Container {...demoProps}>
            <Grid>
                <Grid.Col span={3}>
                    <Badge variant="light" color="blue">Tareas pendientes</Badge>
                    <Card
                        className={classes.pointer}
                    >

                        <Text fw={500} size="lg" mt="md">
                            You&apos;ve won a million dollars in cash!
                        </Text>

                        <Text mt="xs" c="dimmed" size="sm">
                            Please click anywhere on this card to claim your reward, this is not a fraud, trust us
                        </Text>
                    </Card>
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