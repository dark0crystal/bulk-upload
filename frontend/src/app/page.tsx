'use client';

import { useState } from 'react';
import InputSection from '../components/InputSection';
import ProductCardsGrid from '../components/ProductCardsGrid';
import ProcessingModal from '../components/ProcessingModal';
import { Project, ProjectStatus } from '../types';

export default function Home() {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projectStatus, setProjectStatus] = useState<ProjectStatus>('input');
  const [isProcessing, setIsProcessing] = useState(false);

  // Create a new project
  const createProject = async (projectData: any) => {
    try {
      const formData = new FormData();
      if (projectData.name) formData.append('name', projectData.name);
      if (projectData.rawText) formData.append('raw_input_text', projectData.rawText);
      
      projectData.inputImages?.forEach((image: File) => {
        formData.append(`input_images`, image);
      });

      const response = await fetch('http://localhost:8000/api/projects/', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to create project');
      
      const data = await response.json();
      setCurrentProject(data.project);
      setProjectStatus('input');
      return data.project;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  };

  // Parse input (text + images)
  const parseInput = async (projectId: string, inputData: any) => {
    try {
      const formData = new FormData();
      if (inputData.rawText) formData.append('raw_text', inputData.rawText);
      
      inputData.images?.forEach((image: File) => {
        formData.append('images', image);
      });

      const response = await fetch(`http://localhost:8000/api/projects/${projectId}/parse-input/`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to parse input');
      
      const data = await response.json();
      setCurrentProject(data.project);
      setProjectStatus('parsed');
      return data;
    } catch (error) {
      console.error('Error parsing input:', error);
      throw error;
    }
  };

  // Generate images for all products
  const generateImages = async (projectId: string) => {
    try {
      setIsProcessing(true);
      const response = await fetch(`http://localhost:8000/api/projects/${projectId}/generate-images/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          num_images_per_product: 5,
          image_size: 'medium',
        }),
      });

      if (!response.ok) throw new Error('Failed to generate images');
      
      const data = await response.json();
      
      // Refresh project data to get updated cards
      await refreshProject(projectId);
      setProjectStatus('generated');
      
      return data;
    } catch (error) {
      console.error('Error generating images:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  // Refresh project data
  const refreshProject = async (projectId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/projects/${projectId}/`);
      if (!response.ok) throw new Error('Failed to refresh project');
      
      const data = await response.json();
      setCurrentProject(data.project);
    } catch (error) {
      console.error('Error refreshing project:', error);
    }
  };

  // Save and process all cards
  const saveAndProcess = async (projectId: string) => {
    try {
      setIsProcessing(true);
      
      const formData = new FormData();
      formData.append('remove_background', 'true');
      formData.append('add_background', 'true');
      formData.append('output_format', 'png');

      const response = await fetch(`http://localhost:8000/api/projects/${projectId}/process/`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to process project');
      
      const data = await response.json();
      await refreshProject(projectId);
      setProjectStatus('completed');
      
      return data;
    } catch (error) {
      console.error('Error processing project:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="w-[88vw] mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Bulk Product Image Processor
          </h1>
          <p className="text-gray-600">
            Upload product names, generate images, and process them with custom backgrounds
          </p>
        </div>

        {/* Input Phase */}
        {projectStatus === 'input' && (
          <InputSection
            onCreateProject={createProject}
            onParseInput={parseInput}
            currentProject={currentProject}
          />
        )}

        {/* Product Cards Phase */}
        {currentProject && (projectStatus === 'parsed' || projectStatus === 'generated' || projectStatus === 'completed') && (
          <ProductCardsGrid
            project={currentProject}
            onGenerate={() => generateImages(currentProject.id)}
            onSaveAndProcess={() => saveAndProcess(currentProject.id)}
            onRefresh={() => refreshProject(currentProject.id)}
            status={projectStatus}
          />
        )}

        {/* Processing Modal */}
        {isProcessing && (
          <ProcessingModal
            isVisible={isProcessing}
            message="Processing your images..."
          />
        )}
      </div>
    </main>
  );
}