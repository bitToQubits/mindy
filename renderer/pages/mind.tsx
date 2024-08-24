import {
    Text,
    SimpleGrid,
    UnstyledButton,
    useMantineTheme,
    Container,
  } from '@mantine/core';
  import { useRouter } from "next/router";
  import {
    IconTopologyStarRing3,
    IconBooks,
    IconChecklist
  } from '@tabler/icons-react';
  import classes from '../css/ActionsGrid.module.css';
  
  const mockdata = [
    { title: 'Grafo de conocimiento', icon: IconTopologyStarRing3, color: 'indigo', href: '/bankKnowledge' },
    { title: 'Clasificación de data', icon: IconBooks, color: 'red', href: '/topicosClasificacion' },
    { title: 'Administración de tareas', icon: IconChecklist, color: 'green', href: '/admin_tareas' },
  ];
  
  export default function Page(){

    const router = useRouter();

    const demoProps = {
        mt: "10em"
    };

    const theme = useMantineTheme();
  
    const items = mockdata.map((item) => (
      <UnstyledButton key={item.title} className={classes.item} onClick={
        (event) => {
          event.preventDefault();
          router.push(item.href);
        }
      }>
        <item.icon color={theme.colors[item.color][6]} size="2rem" />
        <Text size="xs" mt={7}>
          {item.title}
        </Text>
      </UnstyledButton>
    ));
  
    return (
        <Container {...demoProps}>
            <Text className={classes.title} ta="center" mb="3em">Módulo mental</Text>
            <SimpleGrid cols={2}>
                {items}
            </SimpleGrid>
        </Container>
    );
  }