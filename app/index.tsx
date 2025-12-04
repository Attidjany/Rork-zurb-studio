import { Stack, useRouter } from 'expo-router';
import { Plus, Copy, Trash2 } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useZURB } from '@/contexts/ZURBContext';

type Project = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  owner_id: string;
};

export default function ProjectsScreen() {
  const router = useRouter();
  const { projects, isLoading, createProject, loadProjects, deleteProject, duplicateProject } = useZURB();
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [newProjectName, setNewProjectName] = useState<string>('');
  const [newProjectDesc, setNewProjectDesc] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProjects();
    setRefreshing(false);
  };

  const handleDelete = async (projectId: string) => {
    Alert.alert(
      'Delete Project',
      'Are you sure you want to delete this project? This will also delete all associated sites.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteProject(projectId);
          },
        },
      ]
    );
  };

  const handleDuplicate = async (projectId: string) => {
    await duplicateProject(projectId);
  };

  const handleCreateProject = async () => {
    if (newProjectName.trim()) {
      setIsCreating(true);
      try {
        const result = await createProject(newProjectName.trim(), newProjectDesc.trim() || undefined);
        if (result) {
          setNewProjectName('');
          setNewProjectDesc('');
          setModalVisible(false);
        }
      } finally {
        setIsCreating(false);
      }
    }
  };

  const renderProject = ({ item }: { item: Project }) => (
    <View style={styles.projectCard}>
      <TouchableOpacity
        style={styles.projectCardMain}
        onPress={() => router.push({ pathname: '/project/[id]', params: { id: item.id } } as any)}
        testID={`project-${item.id}`}
      >
        <View style={styles.projectHeader}>
          <Text style={styles.projectName}>{item.name}</Text>
        </View>
        {item.description ? (
          <Text style={styles.projectDesc} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
        <Text style={styles.projectDate}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </TouchableOpacity>
      <View style={styles.projectActions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => handleDuplicate(item.id)}
          testID={`duplicate-project-${item.id}`}
        >
          <Copy size={18} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => handleDelete(item.id)}
          testID={`delete-project-${item.id}`}
        >
          <Trash2 size={18} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'ZURB Studio',
        }}
      />

      <View style={styles.content}>
        {projects.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Projects Yet</Text>
            <Text style={styles.emptyText}>
              Create your first urban design project to get started
            </Text>
          </View>
        ) : (
          <FlatList
            data={projects}
            renderItem={renderProject}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
          />
        )}

        <TouchableOpacity
          style={styles.fab}
          onPress={() => setModalVisible(true)}
          testID="create-project-button"
        >
          <Plus size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Project</Text>

            <TextInput
              style={styles.input}
              placeholder="Project Name"
              value={newProjectName}
              onChangeText={setNewProjectName}
              testID="project-name-input"
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optional)"
              value={newProjectDesc}
              onChangeText={setNewProjectDesc}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              testID="project-desc-input"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setModalVisible(false);
                  setNewProjectName('');
                  setNewProjectDesc('');
                }}
                testID="cancel-button"
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={handleCreateProject}
                disabled={!newProjectName.trim() || isCreating}
                testID="confirm-create-button"
              >
                {isCreating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.createButtonText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
  },
  content: {
    flex: 1,
  },
  headerButton: {
    padding: 8,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  projectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  projectCardMain: {
    padding: 16,
  },
  projectActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F5F5F7',
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#F5F5F7',
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  projectName: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#000000',
    flex: 1,
  },
  projectSites: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500' as const,
  },
  projectDesc: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
    lineHeight: 20,
  },
  projectDate: {
    fontSize: 12,
    color: '#999999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600' as const,
    color: '#000000',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '600' as const,
    color: '#000000',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#F5F5F7',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    color: '#000000',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F7',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#666666',
  },
  createButton: {
    backgroundColor: '#007AFF',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
});
