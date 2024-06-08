import {
    Grid,
    Container,
  } from '@mantine/core';

export default function Page(){

    const demoProps = {
        mt: "10em"
    }

    return (
        <Container {...demoProps}>
            <Grid>
                <Grid.Col span={3}>

                </Grid.Col>
                <Grid.Col span={3}>
                    
                </Grid.Col>
                <Grid.Col span={3}>

                </Grid.Col>
                <Grid.Col span={3}>

                </Grid.Col>
                <Grid.Col span={3}>

                </Grid.Col>
            </Grid>
        </Container>
    );
}